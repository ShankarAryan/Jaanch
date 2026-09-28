// Pure helper - no server-only / prisma deps, so it stays unit-testable.
//
// Derives a bidder-scoped supporting document's target (which company, which
// doc type, and optionally which tender) from its path INSIDE a ZIP, for the
// case where the ZIP carries no manifest.json. This is the same information a
// manifest row would have given - just read off the filename convention every
// document ZIP in this project already follows:
//
//   <companySlug>__<docTypeKeyword>.pdf
//
// optionally nested under folders that spell out the tender's referenceNo,
// e.g.  GEM/2026/B/7801588/coromandel-diagnostics__OEM.pdf
//
// Nothing here guesses: a filename that doesn't match the convention, or an
// unrecognised keyword, returns { ok: false } and the caller skips that one
// file only. Tender / bidder existence and multi-tender ambiguity are resolved
// later, against the database, at commit time (see commit.ts).

/** docTypeKeyword (matched case-insensitively as a substring) -> Document.docType. Order matters. */
const DOC_TYPE_RULES: { match: RegExp; docType: string }[] = [
  { match: /oem/i, docType: 'OEM_AUTHORIZATION_CERTIFICATE' },
  { match: /local|india|mii/i, docType: 'LOCAL_CONTENT_CERTIFICATE' },
  { match: /pan/i, docType: 'PAN_CARD' },
  { match: /gst/i, docType: 'GST_CERTIFICATE' },
  { match: /udyam/i, docType: 'UDYAM_CERTIFICATE' },
  { match: /epfo|esic|labour/i, docType: 'EPFO_ESIC_CHALLAN' },
  { match: /startup|dpiit/i, docType: 'STARTUP_INDIA_CERTIFICATE' },
  { match: /nsic/i, docType: 'NSIC_CERTIFICATE' },
  { match: /digilocker/i, docType: 'DIGILOCKER_CERTIFICATE' },
  { match: /bis|quality|iso/i, docType: 'BIS_QUALITY_CERTIFICATE' },
];

export type InferredDocName =
  | { ok: true; companySlug: string; docType: string; docTypeKeyword: string; tenderReferenceNo: string | null }
  | { ok: false; reason: string };

const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

/**
 * @param zipEntryPath the entry's full path within the ZIP (forward slashes),
 *   e.g. "GEM/2026/B/7801588/coromandel-diagnostics__OEM.pdf" or "acme__pan.pdf".
 */
export function parseInferredDocName(zipEntryPath: string): InferredDocName {
  const segments = zipEntryPath.split('/').filter(Boolean);
  const fileName = segments.pop() ?? zipEntryPath;
  const folderSegments = segments;

  if (extOf(fileName) !== 'pdf') {
    return { ok: false, reason: `"${fileName}" is not a PDF — bidder documents must be PDFs.` };
  }

  const base = fileName.replace(/\.pdf$/i, '');
  const sep = base.indexOf('__');
  if (sep < 0) {
    return {
      ok: false,
      reason: `"${fileName}" doesn't match the <companySlug>__<doctype>.pdf naming convention.`,
    };
  }

  const companySlug = base.slice(0, sep).trim().toLowerCase();
  const docTypeKeyword = base.slice(sep + 2).trim();
  if (!companySlug) return { ok: false, reason: `"${fileName}": company slug (the part before "__") is empty.` };
  if (!docTypeKeyword) return { ok: false, reason: `"${fileName}": document-type keyword (the part after "__") is empty.` };

  const rule = DOC_TYPE_RULES.find((r) => r.match.test(docTypeKeyword));
  if (!rule) {
    return {
      ok: false,
      reason: `"${fileName}": document-type keyword "${docTypeKeyword}" isn't one of oem / local|india|mii / pan / gst / udyam / epfo|esic / startup / nsic / digilocker / bis.`,
    };
  }

  // A tender referenceNo looks like "GEM/2026/B/7801588" - it contains
  // slashes, so it spells out as several nested folders. Take the folder path
  // from the first "GEM" segment onward; anything before that (a wrapper
  // folder the ZIP tool added) is ignored. No "GEM" segment -> no folder hint,
  // and the tender is resolved from the company slug at commit time.
  const gemIdx = folderSegments.findIndex((s) => s.toUpperCase() === 'GEM');
  const tenderReferenceNo = gemIdx >= 0 ? folderSegments.slice(gemIdx).join('/') : null;

  return { ok: true, companySlug, docType: rule.docType, docTypeKeyword, tenderReferenceNo };
}
