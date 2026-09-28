import type { TenderExtraction, SpreadsheetExtraction } from '@/lib/ai/documentExtraction';

export type ImportMode = 'add' | 'replace-all';

/** Required Tender columns - a null here blocks the row from being committed. */
export const REQUIRED_TENDER_FIELDS = ['referenceNo', 'title', 'organization', 'department', 'category'] as const;

export type TenderEntry = {
  kind: 'tender';
  filename: string;
  mimeType: string;
  extraction: TenderExtraction;
  /** Required fields that came back null - non-empty means this row can't be committed. */
  blockers: string[];
};

export type RecordsEntry = {
  kind: 'records';
  filename: string;
  mimeType: string;
  extraction: SpreadsheetExtraction;
};

/**
 * A single PDF inside a ZIP identified as a bidder-scoped supporting document
 * (OEM authorization letter, local-content certificate, etc.) rather than a
 * tender document. Never routed through the tender-extraction LLM call - it is
 * attached directly to the named bidder at commit time. Deliberately carries
 * no file bytes (only metadata) so reviewJson stays small regardless of how
 * large the ZIP is.
 *
 * `source`:
 *  - 'manifest'  - the ZIP had a manifest.json and this PDF matched a row in it.
 *  - 'inferred'  - the ZIP had no manifest; company / doc-type were read off the
 *                  <companySlug>__<doctype>.pdf filename convention, and the
 *                  tender from a GEM/... subfolder if present (else resolved
 *                  from the slug at commit time). `tenderReferenceNo` is null
 *                  when there was no subfolder hint.
 */
export type BidderDocumentEntry = {
  kind: 'bidderDocument';
  source: 'manifest' | 'inferred';
  filename: string; // path within the ZIP, e.g. "Tender02_.../bluewave-defence...pdf"
  tenderReferenceNo: string | null;
  companySlug: string;
  docType: string;
  mimeType: string;
  sizeBytes: number;
};

export type SkippedEntry = {
  kind: 'skipped';
  filename: string;
  reason: string;
};

export type ImportEntry = TenderEntry | RecordsEntry | BidderDocumentEntry | SkippedEntry;

export interface ImportReview {
  sourceFilename: string;
  sourcePath: string; // path within the dataset-uploads bucket
  sourceMimeType: string;
  entries: ImportEntry[];
  warnings: string[];
  llmAvailable: boolean;
}

/** Per-file outcome for each bidder-document entry the commit tried to attach. */
export interface DocumentAttachResult {
  file: string; // the PDF's name (basename)
  outcome: 'attached' | 'skipped';
  detail: string;
}

export interface CommitResult {
  /** '' when the commit created nothing and its ImportBatch row was rolled back. */
  importBatchId: string;
  recordsCreated: number;
  summary: string;
  notes: string[];
  documentResults: DocumentAttachResult[];
}
