import { prisma } from './db';
import { getProvider } from './providers/registry';
import { evaluateRequirement, type RequirementEvaluation } from './rulesEngine';
import { computeScore } from './scoring';
import {
  extractLocalContentCertificate,
  extractLocalContentCertificateFromFile,
  extractOemAuthorizationFromFile,
  extractPanCardFromFile,
  extractGstCertificateFromFile,
  extractUdyamCertificateFromFile,
  type LocalContentExtraction,
  type OemAuthorizationExtraction,
  type PanCardExtraction,
  type GstCertificateExtraction,
  type UdyamCertificateExtraction,
} from './ai/documentExtraction';
import { generateRecommendation } from './ai/recommendation';
import { logAudit } from './auditLog';

/**
 * The core pipeline: for one bidder, run every configured requirement's
 * verification, evaluate it against the tender's rules, score it, get an
 * AI recommendation, and persist all of it (with an audit trail entry at
 * every step). This is the one function the UI and any future API caller
 * needs to know about.
 */
export async function runVerificationForBidder(bidderId: string) {
  const bidder = await prisma.bidder.findUniqueOrThrow({
    where: { id: bidderId },
    include: { tender: { include: { requirements: true } }, documents: true },
  });

  await logAudit({ bidderId, actor: 'SYSTEM', action: 'VERIFICATION_STARTED', details: { tenderId: bidder.tenderId } });

  // Step 1: run AI extraction on any document that hasn't been processed yet.
  for (const doc of bidder.documents) {
    if (doc.extractedData) continue;

    const asFile = doc.fileData && doc.mimeType ? Buffer.from(doc.fileData).toString('base64') : null;
    let extracted:
      | LocalContentExtraction
      | OemAuthorizationExtraction
      | PanCardExtraction
      | GstCertificateExtraction
      | UdyamCertificateExtraction
      | Record<string, unknown>
      | null = null;
    let extractionSource: 'uploaded-file' | 'ocr-text' | null = null;

    if (doc.docType === 'LOCAL_CONTENT_CERTIFICATE') {
      // A real uploaded file goes straight to a multimodal call; a seeded
      // document falls back to its simulated-OCR text. Same extraction shape.
      if (asFile) {
        extracted = await extractLocalContentCertificateFromFile(asFile, doc.mimeType!);
        extractionSource = 'uploaded-file';
      } else if (doc.rawText) {
        extracted = await extractLocalContentCertificate(doc.rawText);
        extractionSource = 'ocr-text';
      }
    } else if (doc.docType === 'OEM_AUTHORIZATION_CERTIFICATE') {
      if (asFile) {
        extracted = await extractOemAuthorizationFromFile(asFile, doc.mimeType!);
        extractionSource = 'uploaded-file';
      }
    } else if (doc.docType === 'PAN_CARD') {
      if (asFile) {
        extracted = await extractPanCardFromFile(asFile, doc.mimeType!);
        extractionSource = 'uploaded-file';
      }
    } else if (doc.docType === 'GST_CERTIFICATE') {
      if (asFile) {
        extracted = await extractGstCertificateFromFile(asFile, doc.mimeType!);
        extractionSource = 'uploaded-file';
      }
    } else if (doc.docType === 'UDYAM_CERTIFICATE') {
      if (asFile) {
        extracted = await extractUdyamCertificateFromFile(asFile, doc.mimeType!);
        extractionSource = 'uploaded-file';
      }
    } else if (
      doc.docType === 'EPFO_ESIC_CHALLAN' ||
      doc.docType === 'STARTUP_INDIA_CERTIFICATE' ||
      doc.docType === 'NSIC_CERTIFICATE' ||
      doc.docType === 'DIGILOCKER_CERTIFICATE' ||
      doc.docType === 'BIS_QUALITY_CERTIFICATE'
    ) {
      if (asFile) {
        extracted = {
          verified: true,
          docType: doc.docType,
          fileReceived: true,
          processedAt: new Date().toISOString(),
        };
        extractionSource = 'uploaded-file';
      }
    }

    if (!extracted || !extractionSource) continue;

    await prisma.document.update({ where: { id: doc.id }, data: { extractedData: JSON.stringify(extracted) } });
    await logAudit({
      bidderId,
      actor: 'AI_ENGINE',
      action: 'DOCUMENT_EXTRACTED',
      details: { documentId: doc.id, docType: doc.docType, extractionSource, extracted },
    });
  }

  const documentsForProviders = (await prisma.document.findMany({ where: { bidderId } })).map((d) => ({
    docType: d.docType,
    extractedData: d.extractedData ? (JSON.parse(d.extractedData) as Record<string, unknown>) : null,
  }));

  // Step 2: run every configured verification check.
  const evaluations: RequirementEvaluation[] = [];

  for (const requirement of bidder.tender.requirements) {
    let status: 'VERIFIED_OK' | 'VERIFIED_FAIL' | 'INCONSISTENT' | 'MISSING' | 'ERROR' = 'ERROR';
    let raw: Record<string, unknown> = {};
    let confidence = 0;
    let isMock = true;
    let method = 'simulated';

    try {
      const provider = getProvider(requirement.sourceType);
      const result = await provider.verify({
        bidder: {
          id: bidder.id,
          key: bidder.key,
          companySlug: bidder.companySlug,
          name: bidder.name,
          udyamNumber: bidder.udyamNumber,
          gstin: bidder.gstin,
          pan: bidder.pan,
          cin: bidder.cin,
          claimedTurnoverInrLakh: bidder.claimedTurnoverInrLakh,
          claimedEmployeeCount: bidder.claimedEmployeeCount,
        },
        requirement: {
          code: requirement.code,
          sourceType: requirement.sourceType,
          mandatory: requirement.mandatory,
          ruleConfig: JSON.parse(requirement.ruleConfig),
        },
        documents: documentsForProviders,
        tenderReferenceNo: bidder.tender.referenceNo,
      });
      status = result.status;
      raw = result.raw;
      confidence = result.confidence;
      isMock = result.isMock;
      method = result.method ?? 'simulated';
    } catch (err) {
      raw = { note: err instanceof Error ? err.message : 'Unknown provider error' };
    }

    await prisma.verificationResult.create({
      data: {
        bidderId,
        requirementCode: requirement.code,
        sourceType: requirement.sourceType,
        status,
        confidence,
        rawResponse: JSON.stringify(raw),
        isMock,
        method,
      },
    });

    const evaluation = evaluateRequirement({
      code: requirement.code,
      label: requirement.label,
      mandatory: requirement.mandatory,
      sourceType: requirement.sourceType,
      ruleConfig: JSON.parse(requirement.ruleConfig),
      verification: { status, raw },
    });
    evaluations.push(evaluation);

    await logAudit({
      bidderId,
      actor: 'SYSTEM',
      action: 'REQUIREMENT_CHECKED',
      details: { code: requirement.code, sourceType: requirement.sourceType, status, outcome: evaluation.outcome, isMock, method },
    });
  }

  // Step 3: score + AI recommendation.
  const { complianceScore, riskLevel } = computeScore(evaluations);
  const aiRecommendation = await generateRecommendation({
    bidderName: bidder.name,
    complianceScore,
    riskLevel,
    evaluations,
  });

  const score = await prisma.score.create({
    data: {
      bidderId,
      complianceScore,
      riskLevel,
      breakdown: JSON.stringify(evaluations),
      aiRecommendation,
    },
  });

  await logAudit({ bidderId, actor: 'AI_ENGINE', action: 'SCORE_COMPUTED', details: { complianceScore, riskLevel } });

  return score;
}
