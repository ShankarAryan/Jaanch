import 'server-only';
import { prisma } from '@/lib/db';
import {
  listDatasetFiles,
  downloadDatasetFile,
  uploadFileToStorage,
  deleteStorageFile,
  getStoragePublicUrl,
} from '@/lib/supabaseStorage';
import { processDocumentOcr, type OcrResult } from './ocrService';
import { parseInferredDocName } from '@/lib/import/inferBidderDoc';
import { runVerificationForBidder } from '@/lib/orchestrator';

export interface StorageOcrItem {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  docType: string | null;
  docTypeLabel: string | null;
  confidence: number | null;
  isAuthentic: boolean;
  rawText: string | null;
  summary: string | null;
  entities: OcrResult['entities'] | null;
  validation: OcrResult['validation'] | null;
  tamperFlags: string[];
  matchedBidderId: string | null;
  matchedBidderName: string | null;
  matchedTenderRef: string | null;
  complianceScore: number | null;
  riskLevel: string | null;
  publicUrl: string;
  processedAt: string | null;
  createdAt: string;
}

const SUPPORTED_OCR_EXTS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp']);

/**
 * Initializes the StorageOcrDocument table in Postgres if it doesn't already exist,
 * and adds score and tender metadata columns.
 */
export async function ensureOcrTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public."StorageOcrDocument" (
      "id" TEXT PRIMARY KEY,
      "storagePath" TEXT UNIQUE NOT NULL,
      "fileName" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "sizeBytes" INTEGER,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "docType" TEXT,
      "docTypeLabel" TEXT,
      "confidence" DOUBLE PRECISION,
      "isAuthentic" BOOLEAN DEFAULT true,
      "rawText" TEXT,
      "summary" TEXT,
      "entitiesJson" TEXT,
      "validationJson" TEXT,
      "tamperFlags" TEXT,
      "matchedBidderId" TEXT,
      "matchedBidderName" TEXT,
      "matchedTenderRef" TEXT,
      "complianceScore" DOUBLE PRECISION,
      "riskLevel" TEXT,
      "processedAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Ensure supplemental columns exist
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE public."StorageOcrDocument" ADD COLUMN IF NOT EXISTS "matchedTenderRef" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE public."StorageOcrDocument" ADD COLUMN IF NOT EXISTS "complianceScore" DOUBLE PRECISION;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE public."StorageOcrDocument" ADD COLUMN IF NOT EXISTS "riskLevel" TEXT;`);
  } catch {
    // Columns might already exist or table created with them
  }

}

/**
 * Normalizes an OCR doc type to the canonical Document.docType used by the rules engine.
 */
function toCanonicalDocType(rawDocType?: string | null): string {
  if (!rawDocType) return 'GENERAL_COMPLIANCE_CERTIFICATE';
  const u = rawDocType.toUpperCase();
  if (u.includes('OEM')) return 'OEM_AUTHORIZATION_CERTIFICATE';
  if (u.includes('LOCAL') || u.includes('MII') || u.includes('INDIA')) return 'LOCAL_CONTENT_CERTIFICATE';
  if (u.includes('GST')) return 'GST_CERTIFICATE';
  if (u.includes('PAN')) return 'PAN_CARD';
  if (u.includes('UDYAM') || u.includes('MSME')) return 'UDYAM_CERTIFICATE';
  return 'GENERAL_COMPLIANCE_CERTIFICATE';
}

/**
 * Lists all documents currently recorded in the OCR pipeline table,
 * automatically purging any entries that have been deleted from Supabase Storage.
 */
export async function listPipelineDocuments(): Promise<StorageOcrItem[]> {
  await ensureOcrTable();

  // 1. Live reconciliation with Supabase Storage
  try {
    const bucketFiles = await listDatasetFiles();
    const livePaths = new Set(bucketFiles.map((f) => f.path));

    const existingRows = await prisma.$queryRaw<{ storagePath: string }[]>`
      SELECT "storagePath" FROM public."StorageOcrDocument"
    `;

    const stalePaths = existingRows.filter((r) => !livePaths.has(r.storagePath)).map((r) => r.storagePath);
    if (stalePaths.length > 0) {
      for (const p of stalePaths) {
        await prisma.$executeRawUnsafe(
          `DELETE FROM public."StorageOcrDocument" WHERE "storagePath" = $1`,
          p,
        );
      }
    }
  } catch (err) {
    console.error('[ocr-pipeline] Storage reconciliation warning:', err);
  }

  const rows = await prisma.$queryRaw<any[]>`
    SELECT * FROM public."StorageOcrDocument"
    ORDER BY "createdAt" DESC
  `;


  return rows.map((r) => ({
    id: r.id,
    storagePath: r.storagePath,
    fileName: r.fileName,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    status: r.status,
    docType: r.docType,
    docTypeLabel: r.docTypeLabel,
    confidence: r.confidence,
    isAuthentic: r.isAuthentic ?? true,
    rawText: r.rawText,
    summary: r.summary,
    entities: r.entitiesJson ? JSON.parse(r.entitiesJson) : null,
    validation: r.validationJson ? JSON.parse(r.validationJson) : null,
    tamperFlags: r.tamperFlags ? JSON.parse(r.tamperFlags) : [],
    matchedBidderId: r.matchedBidderId,
    matchedBidderName: r.matchedBidderName,
    matchedTenderRef: r.matchedTenderRef || null,
    complianceScore: r.complianceScore !== null ? Number(r.complianceScore) : null,
    riskLevel: r.riskLevel || null,
    publicUrl: getStoragePublicUrl(r.storagePath),
    processedAt: r.processedAt ? new Date(r.processedAt).toISOString() : null,
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}

/**
 * Scans Supabase Storage for any documents or images, runs Multimodal AI Vision OCR,
 * extracts structured entities (MII %, OEM validity, Tax IDs), automatically links
 * to the corresponding Bidder in the dataset, runs the statutory rules engine,
 * and updates the live Compliance Score.
 */
export async function syncStorageOcrPipeline(): Promise<{
  scanned: number;
  processed: number;
  scored: number;
  errors: string[];
}> {
  await ensureOcrTable();

  // 1. List files in the Supabase Storage bucket
  const bucketFiles = await listDatasetFiles();

  // Filter for OCR-compatible documents and images
  const docFiles = bucketFiles.filter((f) => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    return SUPPORTED_OCR_EXTS.has(ext);
  });

  // 2. Fetch existing records
  const existingRows = await prisma.$queryRaw<{ storagePath: string; status: string }[]>`
    SELECT "storagePath", "status" FROM public."StorageOcrDocument"
  `;
  const existingMap = new Map(existingRows.map((r) => [r.storagePath, r.status]));

  // Cache bidders with tenders for auto-matching
  const allBidders = await prisma.bidder.findMany({
    select: {
      id: true,
      name: true,
      companySlug: true,
      gstin: true,
      pan: true,
      tender: { select: { referenceNo: true } },
    },
  });

  let processedCount = 0;
  let scoredCount = 0;
  const errors: string[] = [];

  for (const f of docFiles) {
    // Skip if already successfully processed
    if (existingMap.get(f.path) === 'PROCESSED') continue;

    try {
      console.log(`[ocr-pipeline] Ingesting file from Supabase Storage: ${f.name}`);
      const buffer = await downloadDatasetFile(f.path);
      const mimeType = f.mimeType || 'application/pdf';
      const base64 = buffer.toString('base64');

      // 1. Run AI Vision OCR & Rule checks
      const ocr = await processDocumentOcr(base64, mimeType, f.name);

      // 2. Match with Bidder:
      // A) Check filename convention: <companySlug>__<doctype>
      let matchedBidder: (typeof allBidders)[0] | undefined;
      const inferred = parseInferredDocName(f.name);
      if (inferred.ok) {
        matchedBidder = allBidders.find(
          (b) => b.companySlug.toLowerCase() === inferred.companySlug.toLowerCase(),
        );
      }

      // B) If no filename match, check extracted entities: GSTIN, PAN, or Company Name
      if (!matchedBidder) {
        const extractedEntity = ocr.entities?.entityName?.toLowerCase() || '';
        const extractedId = ocr.entities?.identifier?.toLowerCase() || '';

        for (const b of allBidders) {
          const bName = b.name.toLowerCase();
          const bSlug = b.companySlug.toLowerCase();
          const bGstin = b.gstin?.toLowerCase() || '';
          const bPan = b.pan?.toLowerCase() || '';

          if (
            (extractedId && (extractedId === bGstin || extractedId === bPan)) ||
            (extractedEntity && (bName.includes(extractedEntity) || extractedEntity.includes(bName) || bSlug.includes(extractedEntity)))
          ) {
            matchedBidder = b;
            break;
          }
        }
      }

      const matchedBidderId = matchedBidder?.id ?? null;
      const matchedBidderName = matchedBidder?.name ?? null;
      const matchedTenderRef = matchedBidder?.tender?.referenceNo ?? null;

      // 3. Determine canonical docType
      const canonicalDocType = inferred.ok ? inferred.docType : toCanonicalDocType(ocr.docType);

      // 4. Attach document to Bidder and execute Rules Engine to calculate Compliance Score
      let complianceScore: number | null = null;
      let riskLevel: string | null = null;

      if (matchedBidderId) {
        try {
          // Replace or insert Document record
          await prisma.document.deleteMany({
            where: { bidderId: matchedBidderId, docType: canonicalDocType },
          });

          await prisma.document.create({
            data: {
              bidderId: matchedBidderId,
              docType: canonicalDocType,
              fileName: f.name,
              mimeType,
              fileData: buffer,
              rawText: ocr.rawText,
              extractedData: JSON.stringify(ocr.entities),
            },
          });

          // Run compliance rules evaluation & compute live score
          const scoreResult = await runVerificationForBidder(matchedBidderId);
          complianceScore = scoreResult.complianceScore;
          riskLevel = scoreResult.riskLevel;
          scoredCount++;
          console.log(
            `[ocr-pipeline] Computed score for ${matchedBidderName}: ${complianceScore}% (${riskLevel})`,
          );
        } catch (scoreErr) {
          console.error(`[ocr-pipeline] Scoring evaluation failed for ${matchedBidderId}:`, scoreErr);
        }
      }

      const id = `ocr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const entitiesJson = JSON.stringify(ocr.entities);
      const validationJson = JSON.stringify(ocr.validation);
      const tamperFlags = JSON.stringify(ocr.tamperFlags);

      await prisma.$executeRawUnsafe(
        `
        INSERT INTO public."StorageOcrDocument" (
          "id", "storagePath", "fileName", "mimeType", "sizeBytes",
          "status", "docType", "docTypeLabel", "confidence", "isAuthentic",
          "rawText", "summary", "entitiesJson", "validationJson", "tamperFlags",
          "matchedBidderId", "matchedBidderName", "matchedTenderRef", "complianceScore", "riskLevel", "processedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
        ON CONFLICT ("storagePath") DO UPDATE SET
          "status" = EXCLUDED."status",
          "docType" = EXCLUDED."docType",
          "docTypeLabel" = EXCLUDED."docTypeLabel",
          "confidence" = EXCLUDED."confidence",
          "isAuthentic" = EXCLUDED."isAuthentic",
          "rawText" = EXCLUDED."rawText",
          "summary" = EXCLUDED."summary",
          "entitiesJson" = EXCLUDED."entitiesJson",
          "validationJson" = EXCLUDED."validationJson",
          "tamperFlags" = EXCLUDED."tamperFlags",
          "matchedBidderId" = EXCLUDED."matchedBidderId",
          "matchedBidderName" = EXCLUDED."matchedBidderName",
          "matchedTenderRef" = EXCLUDED."matchedTenderRef",
          "complianceScore" = EXCLUDED."complianceScore",
          "riskLevel" = EXCLUDED."riskLevel",
          "processedAt" = NOW();
      `,
        id,
        f.path,
        f.name,
        mimeType,
        f.sizeBytes,
        'PROCESSED',
        canonicalDocType,
        ocr.docTypeLabel,
        ocr.confidence,
        ocr.isAuthentic,
        ocr.rawText,
        ocr.summary,
        entitiesJson,
        validationJson,
        tamperFlags,
        matchedBidderId,
        matchedBidderName,
        matchedTenderRef,
        complianceScore,
        riskLevel,
      );

      processedCount++;
    } catch (err: any) {
      console.error(`[ocr-pipeline] Failed to process ${f.name}:`, err);
      errors.push(`${f.name}: ${err.message || 'Unknown error'}`);
    }
  }

  return {
    scanned: docFiles.length,
    processed: processedCount,
    scored: scoredCount,
    errors,
  };
}

/**
 * Uploads an image or document straight into Supabase Storage, immediately
 * triggers the AI OCR pipeline, links to the bidder, and calculates the score.
 */
export async function uploadAndProcessStorageDocument(
  fileName: string,
  buffer: Buffer,
  mimeType: string,
): Promise<StorageOcrItem> {
  await ensureOcrTable();

  // 1. Upload to Supabase Storage bucket
  const storagePath = `ocr_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  await uploadFileToStorage(storagePath, buffer, mimeType);

  // 2. Process through Multimodal OCR
  const base64 = buffer.toString('base64');
  const ocr = await processDocumentOcr(base64, mimeType, fileName);

  // 3. Match with Bidder
  let matchedBidder: any = null;
  const inferred = parseInferredDocName(fileName);

  const allBidders = await prisma.bidder.findMany({
    select: {
      id: true,
      name: true,
      companySlug: true,
      gstin: true,
      pan: true,
      tender: { select: { referenceNo: true } },
    },
  });

  if (inferred.ok) {
    matchedBidder = allBidders.find(
      (b) => b.companySlug.toLowerCase() === inferred.companySlug.toLowerCase(),
    );
  }

  if (!matchedBidder) {
    const extractedEntity = ocr.entities?.entityName?.toLowerCase() || '';
    const extractedId = ocr.entities?.identifier?.toLowerCase() || '';

    for (const b of allBidders) {
      const bName = b.name.toLowerCase();
      const bGstin = b.gstin?.toLowerCase() || '';
      const bPan = b.pan?.toLowerCase() || '';

      if (
        (extractedId && (extractedId === bGstin || extractedId === bPan)) ||
        (extractedEntity && (bName.includes(extractedEntity) || extractedEntity.includes(bName)))
      ) {
        matchedBidder = b;
        break;
      }
    }
  }

  const matchedBidderId = matchedBidder?.id ?? null;
  const matchedBidderName = matchedBidder?.name ?? null;
  const matchedTenderRef = matchedBidder?.tender?.referenceNo ?? null;
  const canonicalDocType = inferred.ok ? inferred.docType : toCanonicalDocType(ocr.docType);

  let complianceScore: number | null = null;
  let riskLevel: string | null = null;

  if (matchedBidderId) {
    try {
      await prisma.document.deleteMany({
        where: { bidderId: matchedBidderId, docType: canonicalDocType },
      });

      await prisma.document.create({
        data: {
          bidderId: matchedBidderId,
          docType: canonicalDocType,
          fileName,
          mimeType,
          fileData: buffer,
          rawText: ocr.rawText,
          extractedData: JSON.stringify(ocr.entities),
        },
      });

      const scoreResult = await runVerificationForBidder(matchedBidderId);
      complianceScore = scoreResult.complianceScore;
      riskLevel = scoreResult.riskLevel;
    } catch (scoreErr) {
      console.error(`[ocr-pipeline] Scoring evaluation failed:`, scoreErr);
    }
  }

  const id = `ocr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const entitiesJson = JSON.stringify(ocr.entities);
  const validationJson = JSON.stringify(ocr.validation);
  const tamperFlags = JSON.stringify(ocr.tamperFlags);

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO public."StorageOcrDocument" (
      "id", "storagePath", "fileName", "mimeType", "sizeBytes",
      "status", "docType", "docTypeLabel", "confidence", "isAuthentic",
      "rawText", "summary", "entitiesJson", "validationJson", "tamperFlags",
      "matchedBidderId", "matchedBidderName", "matchedTenderRef", "complianceScore", "riskLevel", "processedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
    ON CONFLICT ("storagePath") DO UPDATE SET
      "status" = EXCLUDED."status",
      "docType" = EXCLUDED."docType",
      "docTypeLabel" = EXCLUDED."docTypeLabel",
      "confidence" = EXCLUDED."confidence",
      "isAuthentic" = EXCLUDED."isAuthentic",
      "rawText" = EXCLUDED."rawText",
      "summary" = EXCLUDED."summary",
      "entitiesJson" = EXCLUDED."entitiesJson",
      "validationJson" = EXCLUDED."validationJson",
      "tamperFlags" = EXCLUDED."tamperFlags",
      "matchedBidderId" = EXCLUDED."matchedBidderId",
      "matchedBidderName" = EXCLUDED."matchedBidderName",
      "matchedTenderRef" = EXCLUDED."matchedTenderRef",
      "complianceScore" = EXCLUDED."complianceScore",
      "riskLevel" = EXCLUDED."riskLevel",
      "processedAt" = NOW();
  `,
    id,
    storagePath,
    fileName,
    mimeType,
    buffer.length,
    'PROCESSED',
    canonicalDocType,
    ocr.docTypeLabel,
    ocr.confidence,
    ocr.isAuthentic,
    ocr.rawText,
    ocr.summary,
    entitiesJson,
    validationJson,
    tamperFlags,
    matchedBidderId,
    matchedBidderName,
    matchedTenderRef,
    complianceScore,
    riskLevel,
  );

  return {
    id,
    storagePath,
    fileName,
    mimeType,
    sizeBytes: buffer.length,
    status: 'PROCESSED',
    docType: canonicalDocType,
    docTypeLabel: ocr.docTypeLabel,
    confidence: ocr.confidence,
    isAuthentic: ocr.isAuthentic,
    rawText: ocr.rawText,
    summary: ocr.summary,
    entities: ocr.entities,
    validation: ocr.validation,
    tamperFlags: ocr.tamperFlags,
    matchedBidderId,
    matchedBidderName,
    matchedTenderRef,
    complianceScore,
    riskLevel,
    publicUrl: getStoragePublicUrl(storagePath),
    processedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Links a processed OCR document directly to a bidder's compliance record,
 * and automatically triggers verification scoring.
 */
export async function linkOcrDocumentToBidder(storagePath: string, bidderId: string): Promise<void> {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT * FROM public."StorageOcrDocument" WHERE "storagePath" = ${storagePath}
  `;
  if (rows.length === 0) throw new Error('Document not found in OCR pipeline');
  const ocrDoc = rows[0];

  const buffer = await downloadDatasetFile(storagePath);
  const docType = toCanonicalDocType(ocrDoc.docType);

  const bidder = await prisma.bidder.findUniqueOrThrow({
    where: { id: bidderId },
    include: { tender: true },
  });

  await prisma.$transaction([
    prisma.document.deleteMany({ where: { bidderId, docType } }),
    prisma.document.create({
      data: {
        bidderId,
        docType,
        fileName: ocrDoc.fileName,
        mimeType: ocrDoc.mimeType,
        fileData: buffer,
        rawText: ocrDoc.rawText,
        extractedData: ocrDoc.entitiesJson,
      },
    }),
  ]);

  // Run scoring evaluation
  const scoreResult = await runVerificationForBidder(bidderId);

  await prisma.$executeRawUnsafe(
    `UPDATE public."StorageOcrDocument" SET 
      "matchedBidderId" = $1,
      "matchedBidderName" = $2,
      "matchedTenderRef" = $3,
      "complianceScore" = $4,
      "riskLevel" = $5
    WHERE "storagePath" = $6`,
    bidderId,
    bidder.name,
    bidder.tender.referenceNo,
    scoreResult.complianceScore,
    scoreResult.riskLevel,
    storagePath,
  );
}

/**
 * Deletes a document from Supabase Storage and the OCR pipeline records.
 */
export async function deletePipelineDocument(storagePath: string): Promise<void> {
  await deleteStorageFile(storagePath);
  await prisma.$executeRawUnsafe(
    `DELETE FROM public."StorageOcrDocument" WHERE "storagePath" = $1`,
    storagePath,
  );
}
