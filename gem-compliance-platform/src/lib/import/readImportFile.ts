import AdmZip from 'adm-zip';
import {
  extractTenderFromPdf,
  extractRecordsFromSpreadsheet,
  EMPTY_TENDER_EXTRACTION,
  type TenderExtraction,
} from '@/lib/ai/documentExtraction';
import { hasLLM } from '@/lib/ai/llm';
import { mimeForFilename } from './mime';
import { parseInferredDocName } from './inferBidderDoc';
import { REQUIRED_TENDER_FIELDS, type ImportEntry, type ImportReview, type TenderEntry } from './types';

const SPREADSHEET_EXT = new Set(['xlsx', 'xls', 'csv']);

function extOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function tenderEntry(filename: string, extraction: TenderExtraction): TenderEntry {
  const blockers = REQUIRED_TENDER_FIELDS.filter((f) => extraction[f] == null);
  return { kind: 'tender', filename, mimeType: 'application/pdf', extraction, blockers };
}

type ManifestRow = { filename: string; tenderReferenceNo: string; companySlug: string; docType: string };

/** Routes one dataset file to the right extractor. ZIPs are expanded one level. */
export async function readImportFile(filename: string, buffer: Buffer): Promise<ImportReview> {
  const ext = extOf(filename);
  const base: Omit<ImportReview, 'entries' | 'warnings'> = {
    sourceFilename: filename,
    sourcePath: filename,
    sourceMimeType: mimeForFilename(filename),
    llmAvailable: hasLLM(),
  };
  const warnings: string[] = [];
  const entries: ImportEntry[] = [];

  if (ext === 'pdf') {
    if (!hasLLM()) warnings.push('No LLM provider is configured, so tender extraction returned nothing. Set GEMINI_API_KEY (or ANTHROPIC_API_KEY) and re-open this file.');
    const extraction = hasLLM() ? await extractTenderFromPdf(buffer) : { ...EMPTY_TENDER_EXTRACTION };
    entries.push(tenderEntry(filename, extraction));
    return { ...base, entries, warnings };
  }

  if (SPREADSHEET_EXT.has(ext)) {
    const extraction = extractRecordsFromSpreadsheet(buffer);
    entries.push({ kind: 'records', filename, mimeType: mimeForFilename(filename), extraction });
    return { ...base, entries, warnings };
  }

  if (ext === 'zip') {
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch (err) {
      return { ...base, entries: [{ kind: 'skipped', filename, reason: `Not a readable ZIP: ${err instanceof Error ? err.message : err}` }], warnings };
    }
    const zipEntries = zip.getEntries().filter((e) => !e.isDirectory);
    if (zipEntries.length === 0) warnings.push('ZIP is empty.');

    // Optional manifest.json at the ZIP root: [{ filename, tenderReferenceNo, companySlug, docType }].
    // A PDF whose zip path matches a manifest row is a bidder-scoped supporting
    // document (OEM authorization letter, local-content certificate, etc.) -
    // NOT a tender document - so it is routed straight to a bidderDocument
    // entry and never sent through the tender-extraction LLM call. This is
    // what makes a bidder-documents ZIP import fast regardless of how many
    // PDFs it contains, and regardless of their total size.
    //
    // No manifest.json? Then this is treated as a bidder-document bundle too,
    // and each PDF's target is inferred from the <companySlug>__<doctype>.pdf
    // filename convention (parseInferredDocName). A PDF that doesn't match the
    // convention is skipped individually with a rename hint - never sent to the
    // tender extractor, never allowed to block the other files.
    let manifest: ManifestRow[] = [];
    const manifestZipEntry = zipEntries.find((e) => (e.entryName.split('/').pop() ?? e.entryName) === 'manifest.json');
    if (manifestZipEntry) {
      try {
        const parsed = JSON.parse(manifestZipEntry.getData().toString('utf-8'));
        if (Array.isArray(parsed)) {
          manifest = parsed.filter(
            (r): r is ManifestRow =>
              !!r && typeof r.filename === 'string' && typeof r.tenderReferenceNo === 'string' && typeof r.companySlug === 'string' && typeof r.docType === 'string',
          );
          if (manifest.length !== parsed.length) {
            warnings.push('manifest.json had rows missing filename/tenderReferenceNo/companySlug/docType - those rows were ignored.');
          }
        } else {
          warnings.push('manifest.json was found but is not a JSON array - ignored, all PDFs will be treated as tender documents.');
        }
      } catch (err) {
        warnings.push(`Could not parse manifest.json: ${err instanceof Error ? err.message : err} - ignored, all PDFs will be treated as tender documents.`);
      }
    }
    const manifestByPath = new Map(manifest.map((m) => [m.filename, m]));
    const hasManifest = manifestZipEntry != null;

    for (const ze of zipEntries) {
      const inner = ze.entryName.split('/').pop() ?? ze.entryName;
      if (inner.startsWith('.') || inner.startsWith('__MACOSX') || inner === 'manifest.json') continue; // metadata cruft + the manifest itself
      const iext = extOf(inner);
      const data = ze.getData();

      const manifestRow = manifestByPath.get(ze.entryName) ?? manifestByPath.get(inner);
      if (manifestRow && iext === 'pdf') {
        entries.push({
          kind: 'bidderDocument',
          source: 'manifest',
          filename: ze.entryName,
          tenderReferenceNo: manifestRow.tenderReferenceNo,
          companySlug: manifestRow.companySlug,
          docType: manifestRow.docType,
          mimeType: 'application/pdf',
          sizeBytes: data.length,
        });
        continue;
      }

      // No manifest at all -> infer this PDF's bidder / doc-type / tender from
      // its path. Anything that doesn't resolve cleanly is skipped on its own,
      // with a hint, and never sent to the tender extractor.
      if (!hasManifest && iext === 'pdf') {
        const parsed = parseInferredDocName(ze.entryName);
        if (parsed.ok) {
          entries.push({
            kind: 'bidderDocument',
            source: 'inferred',
            filename: ze.entryName,
            tenderReferenceNo: parsed.tenderReferenceNo,
            companySlug: parsed.companySlug,
            docType: parsed.docType,
            mimeType: 'application/pdf',
            sizeBytes: data.length,
          });
        } else {
          entries.push({
            kind: 'skipped',
            filename: ze.entryName,
            reason: `${parsed.reason} Rename it to <companySlug>__<doctype>.pdf (doctype = oem / local / pan / gst / udyam), or add a manifest.json.`,
          });
          warnings.push(`"${inner}" couldn't be auto-matched to a bidder — skipped.`);
        }
        continue;
      }

      if (iext === 'pdf') {
        if (!hasLLM()) warnings.push(`"${inner}": no LLM provider configured - tender extraction returned nothing.`);
        const extraction = hasLLM() ? await extractTenderFromPdf(data) : { ...EMPTY_TENDER_EXTRACTION };
        entries.push(tenderEntry(inner, extraction));
      } else if (SPREADSHEET_EXT.has(iext)) {
        entries.push({ kind: 'records', filename: inner, mimeType: mimeForFilename(inner), extraction: extractRecordsFromSpreadsheet(data) });
      } else {
        entries.push({ kind: 'skipped', filename: inner, reason: `Unsupported type ".${iext || '?'}" inside the ZIP - not a PDF/Excel/CSV.` });
        warnings.push(`"${inner}" was skipped (unsupported type).`);
      }
    }
    return { ...base, entries, warnings };
  }

  return {
    ...base,
    entries: [{ kind: 'skipped', filename, reason: `Unsupported file type ".${ext || '?'}". The import tool handles PDF, Excel (.xlsx/.xls), CSV, and ZIP.` }],
    warnings: [`"${filename}" is not a type the import tool can read.`],
  };
}
