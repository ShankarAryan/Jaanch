import * as XLSX from 'xlsx';
import { llmComplete, hasLLM } from './llm';

export interface LocalContentExtraction {
  localContentPercent: number | null;
  certifyingAgencyName: string | null;
}

const EXTRACTION_INSTRUCTION =
  'Extract structured data from this Local Content / Make in India certificate. ' +
  'Respond with ONLY a JSON object of the shape ' +
  '{"localContentPercent": number|null, "certifyingAgencyName": string|null}, no other text. ' +
  'localContentPercent is the declared local content percentage as a number. ' +
  'certifyingAgencyName is the name of the CA firm / agency that certified it, if stated.';

/** Tolerant JSON parse - strips ```json fences the model sometimes adds. */
function parseExtraction(text: string): LocalContentExtraction {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  return {
    localContentPercent: typeof parsed.localContentPercent === 'number' ? parsed.localContentPercent : null,
    certifyingAgencyName: typeof parsed.certifyingAgencyName === 'string' ? parsed.certifyingAgencyName : null,
  };
}

/** Last-resort deterministic fallback used whenever the AI path is unavailable. */
function regexFallback(rawText: string): LocalContentExtraction {
  const match = rawText.match(/(\d{1,3})\s*%/);
  return { localContentPercent: match ? Number(match[1]) : null, certifyingAgencyName: null };
}

/**
 * Turns simulated-OCR text (Document.rawText) into structured fields.
 * In a real deployment, an OCR step runs first (e.g. on a scanned
 * certificate image) and its output text is what gets passed in here -
 * this function's contract doesn't change either way, which is the
 * whole point of keeping OCR and extraction as separate steps.
 *
 * For documents uploaded as an actual file (PDF/image), use
 * extractLocalContentCertificateFromFile instead - it sends the file
 * straight to a multimodal call and returns the same shape.
 */
export async function extractLocalContentCertificate(rawText: string): Promise<LocalContentExtraction> {
  if (!hasLLM()) {
    // Deterministic fallback so the pipeline still produces something
    // usable without any LLM provider configured.
    return regexFallback(rawText);
  }

  try {
    const text = await llmComplete({
      prompt: `${EXTRACTION_INSTRUCTION}\n\n---\n${rawText}\n---`,
      json: true,
      maxTokens: 300,
    });
    return parseExtraction(text);
  } catch (err) {
    console.warn('[ai] text extraction failed, using regex fallback:', err instanceof Error ? err.message : err);
    return regexFallback(rawText);
  }
}

/**
 * Same extraction contract as extractLocalContentCertificate, but reads an
 * uploaded file directly via a multimodal call - no separate OCR step.
 * Handles images and PDFs. Falls back to a null result if no LLM provider
 * is set or the call fails, so an upload never breaks the pipeline.
 */
export async function extractLocalContentCertificateFromFile(
  fileBase64: string,
  mimeType: string,
): Promise<LocalContentExtraction> {
  const emptyResult: LocalContentExtraction = { localContentPercent: null, certifyingAgencyName: null };

  if (!hasLLM()) {
    // Nothing to regex against - a binary file needs the multimodal call.
    return emptyResult;
  }

  try {
    const text = await llmComplete({
      prompt: EXTRACTION_INSTRUCTION,
      file: { base64: fileBase64, mimeType },
      json: true,
      maxTokens: 300,
    });
    return parseExtraction(text);
  } catch (err) {
    console.warn('[ai] file extraction failed, returning null result:', err instanceof Error ? err.message : err);
    return emptyResult;
  }
}

// --- OEM authorization letter -------------------------------------------

export interface OemAuthorizationExtraction {
  /** null = the LLM could not be consulted (no provider / call failed). */
  looksLikeOemAuthLetter: boolean | null;
  oemName: string | null;
  authorizedBidderName: string | null;
}

const OEM_INSTRUCTION =
  'You are checking an OEM (Original Equipment Manufacturer) authorization letter submitted with a government ' +
  'procurement bid. Respond with ONLY a JSON object of the shape ' +
  '{"looksLikeOemAuthLetter": boolean, "oemName": string|null, "authorizedBidderName": string|null}, no other text.\n' +
  '- looksLikeOemAuthLetter: true ONLY if this document is plausibly an OEM / manufacturer authorization or ' +
  'dealership letter that authorises a company to bid for, supply, or resell the manufacturer’s products. ' +
  'false for anything else (invoices, datasheets, screenshots, timetables, price lists, unrelated or blank documents).\n' +
  '- oemName: the manufacturer / OEM issuing the authorization, or null.\n' +
  '- authorizedBidderName: the company / dealer / reseller being authorised, or null.';

function parseOemExtraction(text: string): OemAuthorizationExtraction {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    looksLikeOemAuthLetter: typeof parsed.looksLikeOemAuthLetter === 'boolean' ? parsed.looksLikeOemAuthLetter : null,
    oemName: str(parsed.oemName),
    authorizedBidderName: str(parsed.authorizedBidderName),
  };
}

/**
 * Reads an uploaded OEM authorization letter (PDF/image) via the multimodal
 * LLM: (a) does it plausibly read as an OEM authorization letter at all, and
 * (b) if so, who is the OEM and who is being authorised. Returns
 * `looksLikeOemAuthLetter: null` when no LLM provider is configured or the
 * call fails - the caller then falls back to the labelled stub.
 */
export async function extractOemAuthorizationFromFile(
  fileBase64: string,
  mimeType: string,
): Promise<OemAuthorizationExtraction> {
  const empty: OemAuthorizationExtraction = { looksLikeOemAuthLetter: null, oemName: null, authorizedBidderName: null };
  if (!hasLLM()) return empty;

  try {
    const text = await llmComplete({
      prompt: OEM_INSTRUCTION,
      file: { base64: fileBase64, mimeType },
      json: true,
      maxTokens: 300,
    });
    return parseOemExtraction(text);
  } catch (err) {
    console.warn('[ai] OEM-letter extraction failed, returning null verdict:', err instanceof Error ? err.message : err);
    return empty;
  }
}

// --- PAN card -------------------------------------------------------------

export interface PanCardExtraction {
  /** null = the LLM could not be consulted (no provider / call failed). */
  looksLikePanCard: boolean | null;
  panNumber: string | null;
  holderName: string | null;
}

const PAN_CARD_INSTRUCTION =
  'You are checking a PAN (Permanent Account Number) card submitted with a government procurement bid. ' +
  'Respond with ONLY a JSON object of the shape ' +
  '{"looksLikePanCard": boolean, "panNumber": string|null, "holderName": string|null}, no other text.\n' +
  '- looksLikePanCard: true ONLY if this document is plausibly an Indian Income Tax Dept PAN card. ' +
  'false for anything else (other ID cards, invoices, unrelated or blank documents).\n' +
  '- panNumber: the 10-character PAN printed on the card (e.g. "AAACC1206D"), exactly as printed, or null if not clearly legible.\n' +
  '- holderName: the name printed on the card, or null.';

function parsePanCardExtraction(text: string): PanCardExtraction {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    looksLikePanCard: typeof parsed.looksLikePanCard === 'boolean' ? parsed.looksLikePanCard : null,
    panNumber: str(parsed.panNumber),
    holderName: str(parsed.holderName),
  };
}

/**
 * Reads an uploaded PAN card (PDF/image) via the multimodal LLM. ADDITIVE on
 * top of pan.ts's existing structural + registry check on the bidder's typed
 * PAN field - a bidder with no PAN card uploaded is completely unaffected;
 * one who uploads a card gets it cross-checked against the declared PAN
 * number. Returns `looksLikePanCard: null` when no LLM provider is
 * configured or the call fails - the provider then skips the cross-check
 * rather than guessing.
 */
export async function extractPanCardFromFile(fileBase64: string, mimeType: string): Promise<PanCardExtraction> {
  const empty: PanCardExtraction = { looksLikePanCard: null, panNumber: null, holderName: null };
  if (!hasLLM()) return empty;

  try {
    const text = await llmComplete({
      prompt: PAN_CARD_INSTRUCTION,
      file: { base64: fileBase64, mimeType },
      json: true,
      maxTokens: 300,
    });
    return parsePanCardExtraction(text);
  } catch (err) {
    console.warn('[ai] PAN-card extraction failed, returning null verdict:', err instanceof Error ? err.message : err);
    return empty;
  }
}

// --- GST registration certificate ------------------------------------------

export interface GstCertificateExtraction {
  looksLikeGstCertificate: boolean | null;
  gstin: string | null;
  legalName: string | null;
}

const GST_CERTIFICATE_INSTRUCTION =
  'You are checking a GST registration certificate (Form GST REG-06) submitted with a government procurement bid. ' +
  'Respond with ONLY a JSON object of the shape ' +
  '{"looksLikeGstCertificate": boolean, "gstin": string|null, "legalName": string|null}, no other text.\n' +
  '- looksLikeGstCertificate: true ONLY if this document is plausibly a GST registration certificate. ' +
  'false for anything else (invoices, other ID documents, unrelated or blank documents).\n' +
  '- gstin: the 15-character GSTIN printed on the certificate, exactly as printed, or null if not clearly legible.\n' +
  '- legalName: the registered legal name printed on the certificate, or null.';

function parseGstCertificateExtraction(text: string): GstCertificateExtraction {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    looksLikeGstCertificate: typeof parsed.looksLikeGstCertificate === 'boolean' ? parsed.looksLikeGstCertificate : null,
    gstin: str(parsed.gstin),
    legalName: str(parsed.legalName),
  };
}

/**
 * Reads an uploaded GST registration certificate (PDF/image) via the
 * multimodal LLM. ADDITIVE on top of gst.ts's existing checksum + registry
 * check on the bidder's typed GSTIN - unaffected if no certificate is
 * uploaded; cross-checked against the declared GSTIN if one is.
 */
export async function extractGstCertificateFromFile(fileBase64: string, mimeType: string): Promise<GstCertificateExtraction> {
  const empty: GstCertificateExtraction = { looksLikeGstCertificate: null, gstin: null, legalName: null };
  if (!hasLLM()) return empty;

  try {
    const text = await llmComplete({
      prompt: GST_CERTIFICATE_INSTRUCTION,
      file: { base64: fileBase64, mimeType },
      json: true,
      maxTokens: 300,
    });
    return parseGstCertificateExtraction(text);
  } catch (err) {
    console.warn('[ai] GST-certificate extraction failed, returning null verdict:', err instanceof Error ? err.message : err);
    return empty;
  }
}

// --- Udyam / MSME registration certificate ----------------------------------

export interface UdyamCertificateExtraction {
  looksLikeUdyamCertificate: boolean | null;
  udyamNumber: string | null;
  enterpriseName: string | null;
}

const UDYAM_CERTIFICATE_INSTRUCTION =
  'You are checking a Udyam Registration Certificate (MSME registration) submitted with a government procurement bid. ' +
  'Respond with ONLY a JSON object of the shape ' +
  '{"looksLikeUdyamCertificate": boolean, "udyamNumber": string|null, "enterpriseName": string|null}, no other text.\n' +
  '- looksLikeUdyamCertificate: true ONLY if this document is plausibly a Udyam Registration Certificate. ' +
  'false for anything else (invoices, other ID documents, unrelated or blank documents).\n' +
  '- udyamNumber: the Udyam Registration Number printed on the certificate (e.g. "UDYAM-TN-03-0012345"), exactly as printed, or null if not clearly legible.\n' +
  '- enterpriseName: the enterprise name printed on the certificate, or null.';

function parseUdyamCertificateExtraction(text: string): UdyamCertificateExtraction {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    looksLikeUdyamCertificate: typeof parsed.looksLikeUdyamCertificate === 'boolean' ? parsed.looksLikeUdyamCertificate : null,
    udyamNumber: str(parsed.udyamNumber),
    enterpriseName: str(parsed.enterpriseName),
  };
}

/**
 * Reads an uploaded Udyam Registration Certificate (PDF/image) via the
 * multimodal LLM. ADDITIVE on top of udyam.ts's existing registry lookup on
 * the bidder's typed Udyam number - unaffected if no certificate is
 * uploaded; cross-checked against the declared Udyam number if one is.
 */
export async function extractUdyamCertificateFromFile(fileBase64: string, mimeType: string): Promise<UdyamCertificateExtraction> {
  const empty: UdyamCertificateExtraction = { looksLikeUdyamCertificate: null, udyamNumber: null, enterpriseName: null };
  if (!hasLLM()) return empty;

  try {
    const text = await llmComplete({
      prompt: UDYAM_CERTIFICATE_INSTRUCTION,
      file: { base64: fileBase64, mimeType },
      json: true,
      maxTokens: 300,
    });
    return parseUdyamCertificateExtraction(text);
  } catch (err) {
    console.warn('[ai] Udyam-certificate extraction failed, returning null verdict:', err instanceof Error ? err.message : err);
    return empty;
  }
}

// --- Dataset import: tender PDF -----------------------------------------
// Used by the backstage /admin/import tool. HARD RULE: a field that is not
// clearly and explicitly stated in the source document is returned as null.
// Never guess, never infer from context. This app's whole pitch is honesty
// about what is real vs. simulated - a fabricated field breaks that directly.

export interface TenderExtraction {
  referenceNo: string | null;
  title: string | null;
  organization: string | null;
  department: string | null;
  category: string | null;
  documentDated: string | null; // ISO date string, or null
  bidEndsAt: string | null; // ISO datetime string, or null
  emdRequired: boolean | null;
  emdNote: string | null;
  miiNote: string | null;
  mseNote: string | null;
}

export const EMPTY_TENDER_EXTRACTION: TenderExtraction = {
  referenceNo: null,
  title: null,
  organization: null,
  department: null,
  category: null,
  documentDated: null,
  bidEndsAt: null,
  emdRequired: null,
  emdNote: null,
  miiNote: null,
  mseNote: null,
};

const TENDER_INSTRUCTION =
  'You are reading a Government e-Marketplace (GeM) bid / tender document. Extract ONLY fields that are ' +
  'explicitly and unambiguously stated in the document. If a field is not clearly stated, return null for it - ' +
  'do NOT guess, infer, or fill from typical values. Respond with ONLY a JSON object of this exact shape ' +
  '(no other text):\n' +
  '{\n' +
  '  "referenceNo": string|null,      // the GeM bid number, e.g. "GEM/2026/B/7983771"\n' +
  '  "title": string|null,            // the item / work title\n' +
  '  "organization": string|null,     // buying organisation / office\n' +
  '  "department": string|null,       // ministry + department\n' +
  '  "category": string|null,         // bid category / GeM category as printed\n' +
  '  "documentDated": string|null,    // the document\'s "Dated" field, as ISO date "YYYY-MM-DD"\n' +
  '  "bidEndsAt": string|null,        // bid end / closing date-time, ISO "YYYY-MM-DDTHH:MM:SS+05:30"\n' +
  '  "emdRequired": boolean|null,     // true if EMD is required, false if the doc says not required, null if unstated\n' +
  '  "emdNote": string|null,          // verbatim EMD / ePBG detail (amount, bank, duration)\n' +
  '  "miiNote": string|null,          // verbatim Make in India purchase-preference position\n' +
  '  "mseNote": string|null           // verbatim MSE purchase-preference position\n' +
  '}';

function parseTenderExtraction(text: string): TenderExtraction {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const p = JSON.parse(cleaned) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    referenceNo: str(p.referenceNo),
    title: str(p.title),
    organization: str(p.organization),
    department: str(p.department),
    category: str(p.category),
    documentDated: str(p.documentDated),
    bidEndsAt: str(p.bidEndsAt),
    emdRequired: typeof p.emdRequired === 'boolean' ? p.emdRequired : null,
    emdNote: str(p.emdNote),
    miiNote: str(p.miiNote),
    mseNote: str(p.mseNote),
  };
}

/**
 * Extracts tender metadata from a bid-document PDF via the multimodal LLM.
 * Returns all-null when no LLM provider is configured (the review screen then
 * shows every field as "not found" and the commit is blocked) - it never
 * fabricates values to fill the gap.
 */
export async function extractTenderFromPdf(buffer: Buffer): Promise<TenderExtraction> {
  if (!hasLLM()) return { ...EMPTY_TENDER_EXTRACTION };
  const text = await llmComplete({
    prompt: TENDER_INSTRUCTION,
    file: { base64: buffer.toString('base64'), mimeType: 'application/pdf' },
    json: true,
    maxTokens: 900,
  });
  return parseTenderExtraction(text);
}

// --- Dataset import: bidder spreadsheet -------------------------------------
// Structured parsing (xlsx), NOT an LLM call. Same hard rule: a cell that is
// blank / absent becomes null, never a guessed value.

export interface BidderRecordExtraction {
  name: string | null;
  companySlug: string | null;
  tenderReferenceNo: string | null;
  gstin: string | null;
  pan: string | null;
  udyamNumber: string | null;
  claimedTurnoverInrLakh: number | null;
  claimedEmployeeCount: number | null;
}

// Accepts a range of reasonable header spellings so an organizer's sheet
// doesn't have to match our column names exactly.
const HEADER_ALIASES: Record<keyof BidderRecordExtraction, string[]> = {
  name: ['name', 'bidder', 'biddername', 'bidder name', 'company', 'companyname', 'company name', 'firm', 'firm name'],
  companySlug: ['companyslug', 'company slug', 'slug', 'companyid', 'company id'],
  tenderReferenceNo: ['tenderreferenceno', 'tender', 'tender ref', 'tenderref', 'referenceno', 'reference no', 'bid number', 'bidnumber', 'gem bid', 'tender no', 'tenderno'],
  gstin: ['gstin', 'gst', 'gst no', 'gstno', 'gst number'],
  pan: ['pan', 'pan no', 'panno', 'pan number'],
  udyamNumber: ['udyamnumber', 'udyam', 'udyam no', 'udyamno', 'udyam number', 'msme', 'msme no', 'udyam registration'],
  claimedTurnoverInrLakh: ['claimedturnoverinrlakh', 'turnover', 'turnover lakh', 'turnover (lakh)', 'annual turnover', 'turnoverlakh', 'turnover in lakh'],
  claimedEmployeeCount: ['claimedemployeecount', 'employees', 'employee count', 'headcount', 'staff', 'no of employees', 'number of employees'],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function buildHeaderMap(headers: string[]): Partial<Record<keyof BidderRecordExtraction, number>> {
  const map: Partial<Record<keyof BidderRecordExtraction, number>> = {};
  headers.forEach((h, i) => {
    const n = norm(h ?? '');
    if (!n) return;
    for (const key of Object.keys(HEADER_ALIASES) as (keyof BidderRecordExtraction)[]) {
      if (map[key] !== undefined) continue;
      if (HEADER_ALIASES[key].some((a) => norm(a) === n)) map[key] = i;
    }
  });
  return map;
}

function cellString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}
function cellNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export interface SpreadsheetExtraction {
  records: BidderRecordExtraction[];
  /** Header row as read, so the review screen can show what was matched. */
  headersFound: string[];
  matchedColumns: string[];
  warnings: string[];
}

/**
 * Parses a bidder spreadsheet (xlsx / xls / csv) into bidder-shaped records.
 * Reads the first sheet only. Unrecognised columns are ignored; a row with
 * no usable name is dropped with a warning.
 */
export function extractRecordsFromSpreadsheet(buffer: Buffer): SpreadsheetExtraction {
  const warnings: string[] = [];
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (err) {
    return { records: [], headersFound: [], matchedColumns: [], warnings: [`Could not parse spreadsheet: ${err instanceof Error ? err.message : err}`] };
  }
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { records: [], headersFound: [], matchedColumns: [], warnings: ['Spreadsheet has no sheets.'] };
  if (wb.SheetNames.length > 1) warnings.push(`Only the first sheet ("${sheetName}") was read; ${wb.SheetNames.length - 1} other sheet(s) ignored.`);

  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, blankrows: false, defval: null });
  if (rows.length < 2) return { records: [], headersFound: [], matchedColumns: [], warnings: [...warnings, 'Spreadsheet has no data rows.'] };

  const headers = (rows[0] as unknown[]).map((h) => (h === null || h === undefined ? '' : String(h)));
  const hm = buildHeaderMap(headers);
  const matchedColumns = (Object.keys(hm) as (keyof BidderRecordExtraction)[]).map((k) => `${k} ← "${headers[hm[k]!]}"`);
  if (hm.name === undefined) warnings.push('No "name" column recognised - every row will be skipped on commit.');

  const records: BidderRecordExtraction[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    const get = (k: keyof BidderRecordExtraction) => (hm[k] === undefined ? null : row[hm[k]!]);
    const name = cellString(get('name'));
    if (!name) {
      warnings.push(`Row ${r + 1}: no name - skipped.`);
      continue;
    }
    records.push({
      name,
      companySlug: cellString(get('companySlug')),
      tenderReferenceNo: cellString(get('tenderReferenceNo')),
      gstin: cellString(get('gstin')),
      pan: cellString(get('pan')),
      udyamNumber: cellString(get('udyamNumber')),
      claimedTurnoverInrLakh: cellNumber(get('claimedTurnoverInrLakh')),
      claimedEmployeeCount: cellNumber(get('claimedEmployeeCount')),
    });
  }
  return { records, headersFound: headers, matchedColumns, warnings };
}
