import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { downloadDatasetFile } from '@/lib/supabaseStorage';
import type { BidderDocumentEntry, CommitResult, DocumentAttachResult, ImportMode, ImportReview, RecordsEntry, TenderEntry } from './types';

/**
 * The standard requirement set every GeM seller faces regardless of the
 * specific tender - identical to what prisma/seed.ts attaches to all 10
 * seeded tenders via its shared gstReq / panReq / blacklistReq / epfoReq /
 * digilockerReq builders. The tender-specific rows (OEM authorization, the
 * Udyam MSE %/cap, the Make-in-India %/cap or waiver) are NOT added here:
 * they need per-tender judgement the PDF extraction doesn't provide, so an
 * imported tender carries only this baseline until an officer configures more.
 */
function standardRequirements() {
  return [
    { code: 'GST_FILING', label: 'GST Registration & Return Filing', sourceType: 'gst', mandatory: true, ruleConfig: JSON.stringify({ maxFilingDelayMonths: 2, basis: 'GeM seller-registration requirement.' }) },
    { code: 'PAN_IT_COMPLIANCE', label: 'PAN Validity', sourceType: 'pan', mandatory: true, ruleConfig: JSON.stringify({ basis: 'GeM seller-registration requirement.' }) },
    { code: 'BLACKLIST_CHECK', label: 'Blacklisting / Debarment Check', sourceType: 'blacklist', mandatory: true, ruleConfig: JSON.stringify({ basis: 'Standard eligibility gate (CVC / ministry debarment lists).' }) },
    { code: 'EPFO_ESIC_COMPLIANCE', label: 'EPFO / ESIC & Labour Code Compliance (where applicable)', sourceType: 'epfoEsic', mandatory: false, ruleConfig: JSON.stringify({ basis: 'GeM GTC: compliance with the four Labour Codes / pre-existing labour laws.' }) },
    { code: 'DOCUMENT_VERIFICATION', label: 'DigiLocker Document Verification', sourceType: 'digilocker', mandatory: false, ruleConfig: JSON.stringify({}) },
  ];
}

/** Exact deletion order from prisma/seed.ts main(), plus ImportBatch. */
async function wipeAll() {
  await prisma.auditLog.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.score.deleteMany();
  await prisma.verificationResult.deleteMany();
  await prisma.document.deleteMany();
  await prisma.bidder.deleteMany();
  await prisma.complianceRequirement.deleteMany();
  await prisma.tender.deleteMany();
  await prisma.importBatch.deleteMany(); // Tender FKs to ImportBatch, so after tenders
}

/** Keeps a summary line readable when a big ZIP produces dozens of per-file notes. */
function joinNotes(notes: string[], keep = 4): string {
  if (notes.length === 0) return '';
  if (notes.length <= keep) return ' ' + notes.join(' ');
  return ` ${notes.slice(0, keep).join(' ')} …and ${notes.length - keep} more (see /admin/import).`;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'company';

function toDate(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Which entries can actually be committed as tenders. */
export function committableTenders(review: ImportReview): TenderEntry[] {
  return review.entries.filter((e): e is TenderEntry => e.kind === 'tender' && e.blockers.length === 0);
}

export function recordEntries(review: ImportReview): RecordsEntry[] {
  return review.entries.filter((e): e is RecordsEntry => e.kind === 'records');
}

export function bidderDocumentEntries(review: ImportReview): BidderDocumentEntry[] {
  return review.entries.filter((e): e is BidderDocumentEntry => e.kind === 'bidderDocument');
}

/**
 * Applies a reviewed import to the database. 'replace-all' wipes everything
 * first (seed.ts deletion order). Creates one ImportBatch row referencing the
 * bucket file's storagePath (never a copy of the bytes) and links new Tender
 * rows to it.
 */
export async function commitImport(review: ImportReview, mode: ImportMode, processedBy: string): Promise<CommitResult> {
  const tenders = committableTenders(review);
  const records = recordEntries(review);
  const bidderDocs = bidderDocumentEntries(review);
  const notes: string[] = [];

  if (mode === 'replace-all' && tenders.length === 0) {
    throw new Error('Replace All needs at least one importable tender in the file — otherwise it would leave the database with no tenders. Use Add instead, or include the tender PDF.');
  }
  if (tenders.length === 0 && records.every((r) => r.extraction.records.length === 0) && bidderDocs.length === 0) {
    throw new Error('Nothing to import: no committable tender, no bidder records, and no bidder documents were found in this file.');
  }

  if (mode === 'replace-all') {
    await wipeAll();
    notes.push('Replace All: cleared all existing tenders, bidders, requirements, verification results, scores, decisions, audit logs, and import batches.');
  }

  const batch = await prisma.importBatch.create({
    data: {
      filename: review.sourceFilename,
      storagePath: review.sourcePath,
      mimeType: review.sourceMimeType,
      mode,
      processedBy,
      recordsCreated: 0,
      summary: null,
    },
  });

  let created = 0;
  let documentsAttached = 0;

  // --- tenders ---
  for (const t of tenders) {
    const x = t.extraction;
    const existing = await prisma.tender.findUnique({ where: { referenceNo: x.referenceNo! }, select: { id: true } });
    if (existing) {
      notes.push(`Tender ${x.referenceNo} already exists — skipped (a Replace All would have removed it first).`);
      continue;
    }
    if (x.emdRequired == null) notes.push(`Tender ${x.referenceNo}: EMD requirement was not stated in the document — defaulted to "required".`);
    await prisma.tender.create({
      data: {
        referenceNo: x.referenceNo!,
        title: x.title!,
        organization: x.organization!,
        department: x.department!,
        category: x.category!,
        documentDated: toDate(x.documentDated),
        bidEndsAt: toDate(x.bidEndsAt),
        emdRequired: x.emdRequired ?? undefined,
        emdNote: x.emdNote,
        miiNote: x.miiNote,
        mseNote: x.mseNote,
        importBatchId: batch.id,
        requirements: { create: standardRequirements() },
      },
    });
    created++;
  }

  // --- bidder records (attached to an existing tender matched by referenceNo) ---
  for (const rec of records) {
    for (const b of rec.extraction.records) {
      if (!b.tenderReferenceNo) {
        notes.push(`Record "${b.name}": no tender reference — skipped (can't attach a bidder to a tender).`);
        continue;
      }
      const tender = await prisma.tender.findUnique({ where: { referenceNo: b.tenderReferenceNo }, select: { id: true } });
      if (!tender) {
        notes.push(`Record "${b.name}": tender ${b.tenderReferenceNo} not found — skipped.`);
        continue;
      }

      // Dedupe within a tender (same as the tender loop skips existing tenders).
      // Bidder.key carries a random suffix so it can't dedupe - use the natural
      // key: GSTIN, else PAN, else name, all scoped to this tender. Matters for
      // repeated "Add" of the same spreadsheet; Replace All wiped bidders first
      // so nothing matches there.
      const dupWhere = b.gstin
        ? { tenderId: tender.id, gstin: b.gstin }
        : b.pan
          ? { tenderId: tender.id, pan: b.pan }
          : { tenderId: tender.id, name: b.name! };
      const existingBidder = await prisma.bidder.findFirst({ where: dupWhere, select: { id: true } });
      if (existingBidder) {
        notes.push(`Bidder "${b.name}" already exists on tender ${b.tenderReferenceNo} — skipped.`);
        continue;
      }

      const companySlug = b.companySlug ?? slug(b.name!);
      const key = `${companySlug}-import-${crypto.randomBytes(3).toString('hex')}`;
      await prisma.bidder.create({
        data: {
          tenderId: tender.id,
          key,
          companySlug,
          name: b.name!,
          gstin: b.gstin,
          pan: b.pan,
          udyamNumber: b.udyamNumber,
          claimedTurnoverInrLakh: b.claimedTurnoverInrLakh ?? undefined,
          claimedEmployeeCount: b.claimedEmployeeCount ?? undefined,
          // Traces this bidder back to its source spreadsheet, so the
          // auto-import watcher can offer a confirm-before-delete cascade if
          // that file is later removed from Storage. Only spreadsheet-created
          // bidders get this - manifest-ZIP imports attach docs to existing
          // bidders, they don't create rows here.
          importBatchId: batch.id,
        },
      });
      created++;
    }
  }

  // --- bidder documents -----------------------------------------------------
  // PDFs inside a ZIP, attached to an ALREADY-EXISTING bidder. Two sources,
  // same write path:
  //   'manifest' - target came from the ZIP's manifest.json (tenderReferenceNo
  //                is always present).
  //   'inferred' - no manifest; company + doc type were read off the
  //                <companySlug>__<doctype>.pdf filename, and the tender either
  //                from a GEM/... subfolder or (when there's no subfolder) from
  //                the slug here: exactly one live bidder with that slug -> use
  //                its tender; more than one -> ambiguous, skip that file only.
  const documentResults: DocumentAttachResult[] = [];

  /** Which bidder (if any) a document entry attaches to. */
  const resolveDocBidder = async (
    d: BidderDocumentEntry,
  ): Promise<{ bidderId: string; tenderRef: string } | { skip: string }> => {
    if (d.tenderReferenceNo) {
      const tender = await prisma.tender.findUnique({ where: { referenceNo: d.tenderReferenceNo }, select: { id: true } });
      if (!tender) return { skip: `tender ${d.tenderReferenceNo} not found` };
      const bidder = await prisma.bidder.findFirst({ where: { tenderId: tender.id, companySlug: d.companySlug }, select: { id: true } });
      if (!bidder) return { skip: `no bidder with company slug "${d.companySlug}" on tender ${d.tenderReferenceNo} — import that bidder's spreadsheet first, then re-run` };
      return { bidderId: bidder.id, tenderRef: d.tenderReferenceNo };
    }
    // inferred, no subfolder hint: resolve the tender from the slug alone.
    const matches = await prisma.bidder.findMany({
      where: { companySlug: d.companySlug },
      select: { id: true, tender: { select: { referenceNo: true } } },
    });
    if (matches.length === 0) return { skip: `no live bidder has company slug "${d.companySlug}" — import that bidder's spreadsheet first, then re-run` };
    const refs = [...new Set(matches.map((m) => m.tender.referenceNo))];
    if (refs.length > 1) {
      return { skip: `company slug "${d.companySlug}" bids on ${refs.length} tenders (${refs.join(', ')}) — put this file in a subfolder named the tender's referenceNo, or use a manifest.json` };
    }
    return { bidderId: matches[0].id, tenderRef: refs[0] };
  };

  if (bidderDocs.length > 0) {
    // The review object only ever carries lightweight metadata for these
    // entries (never the file bytes - that would bloat reviewJson, which
    // travels through this commit Server Action's body). Re-download the
    // source ZIP once from Supabase Storage and pull each entry's bytes out
    // by its in-zip path. This is also what keeps the import working
    // regardless of how large the ZIP or its individual PDFs are - the
    // Server Action body only ever carries filenames and doc types, never
    // the documents themselves.
    let sourceZip: AdmZip;
    try {
      const zipBuffer = await downloadDatasetFile(review.sourcePath);
      sourceZip = new AdmZip(zipBuffer);
    } catch (err) {
      throw new Error(`Could not re-download "${review.sourceFilename}" from Storage to attach its bidder documents: ${err instanceof Error ? err.message : err}`);
    }

    for (const d of bidderDocs) {
      const fileName = d.filename.split('/').pop() ?? d.filename;

      const resolved = await resolveDocBidder(d);
      if ('skip' in resolved) {
        notes.push(`Document "${d.filename}": ${resolved.skip}.`);
        documentResults.push({ file: fileName, outcome: 'skipped', detail: resolved.skip });
        continue;
      }
      const { bidderId, tenderRef } = resolved;

      const zipEntry = sourceZip.getEntry(d.filename);
      if (!zipEntry) {
        notes.push(`Document "${d.filename}": could not find this file inside the ZIP on re-read — skipped.`);
        documentResults.push({ file: fileName, outcome: 'skipped', detail: 'not found inside the ZIP on re-read' });
        continue;
      }

      // Inferred entries: an identical file (same bidder + doc type + name)
      // already on record is a re-run of the same ZIP - ignore it silently,
      // don't stack a second copy. The manifest path keeps its replace
      // semantics (deleteMany by doc type below) unchanged.
      if (d.source === 'inferred') {
        const dup = await prisma.document.findFirst({ where: { bidderId, docType: d.docType, fileName }, select: { id: true } });
        if (dup) {
          notes.push(`Document "${fileName}": already attached to "${d.companySlug}" (${tenderRef}) — duplicate ignored.`);
          documentResults.push({ file: fileName, outcome: 'skipped', detail: `already attached to ${d.companySlug} (${tenderRef}) — duplicate ignored` });
          continue;
        }
      }

      const fileData = zipEntry.getData();
      await prisma.$transaction([
        prisma.document.deleteMany({ where: { bidderId, docType: d.docType } }),
        prisma.document.create({
          data: { bidderId, docType: d.docType, fileName, mimeType: d.mimeType, fileData, rawText: null },
        }),
      ]);
      documentsAttached++;
      documentResults.push({ file: fileName, outcome: 'attached', detail: `${d.docType} → ${d.companySlug} (${tenderRef})` });
    }
  }

  // A no-manifest bidder-document bundle that resolved to nothing: roll the
  // empty ImportBatch row back so its storagePath doesn't count as "already
  // imported" - re-uploading (or a "Scan now") after the matching bidder
  // spreadsheet lands will then actually retry it.
  const isInferredBundle = bidderDocs.some((d) => d.source === 'inferred');
  if (mode === 'add' && isInferredBundle && created === 0 && documentsAttached === 0 && tenders.length === 0) {
    await prisma.importBatch.delete({ where: { id: batch.id } });
    const summary = `Add from "${review.sourceFilename}": no documents could be auto-matched.${joinNotes(notes)}`;
    return { importBatchId: '', recordsCreated: 0, summary, notes, documentResults };
  }

  const summaryParts: string[] = [];
  const tCount = tenders.length ? Math.min(created, tenders.length) : 0;
  if (created > 0) summaryParts.push(`${created} record(s) created`);
  if (documentsAttached > 0) summaryParts.push(`${documentsAttached} document(s) attached`);
  if (review.warnings.length) summaryParts.push(`${review.warnings.length} warning(s)`);
  if (notes.length) summaryParts.push(`${notes.length} note(s)`);
  const summary = `${mode === 'replace-all' ? 'Replace All' : 'Add'} from "${review.sourceFilename}": ${summaryParts.join(', ') || 'nothing created'}.${joinNotes(notes)}`;

  const updated = await prisma.importBatch.update({
    where: { id: batch.id },
    data: { recordsCreated: created, summary },
  });

  await logAudit({
    actor: `${processedBy} (import)`,
    action: 'DATASET_IMPORTED',
    details: { importBatchId: batch.id, filename: review.sourceFilename, mode, recordsCreated: created, documentsAttached, tenders: tCount },
  });

  return { importBatchId: updated.id, recordsCreated: created, summary, notes, documentResults };
}
