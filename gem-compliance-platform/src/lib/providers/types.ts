/**
 * Every external data source - real or simulated - implements this one
 * interface. The orchestrator and rules engine never know or care whether
 * a given answer came from a live sandbox call or a mock fixture; they
 * only consume VerificationResultPayload. This is what makes it possible
 * to swap a mock provider for a real one later by changing one file in
 * the registry, nothing else.
 */

export type VerificationStatus = 'VERIFIED_OK' | 'VERIFIED_FAIL' | 'INCONSISTENT' | 'MISSING' | 'ERROR';

export interface BidderInput {
  id: string;
  key: string;
  companySlug: string;
  name: string;
  udyamNumber?: string | null;
  gstin?: string | null;
  pan?: string | null;
  cin?: string | null;
  claimedTurnoverInrLakh?: number | null;
  claimedEmployeeCount?: number | null;
}

export interface DocumentInput {
  docType: string;
  extractedData?: Record<string, unknown> | null;
}

export interface VerificationInput {
  bidder: BidderInput;
  requirement: {
    code: string;
    sourceType: string;
    mandatory: boolean;
    ruleConfig: Record<string, unknown>;
  };
  documents: DocumentInput[];
  /**
   * The tender's referenceNo. The only bidder-identity field that's both
   * stable and always correct no matter how the bidder was created -
   * Bidder.key carries a random suffix for anything created through
   * /admin/import (src/lib/import/commit.ts), so a provider that needs to
   * address "this bidder, on this tender" reliably (e.g. the DPIIT
   * cross-check in makeInIndia.ts) should key off companySlug + this, not
   * bidder.key.
   */
  tenderReferenceNo: string;
}

/**
 * How a result was actually produced - so the UI can be honest about which
 * checks run real logic vs. simulated data:
 *   'real'           - outcome determined entirely by a real algorithm
 *                      (e.g. GSTIN Mod-36 checksum, PAN format) with no
 *                      fabricated data involved
 *   'real+simulated' - a real identifier check passed, then a simulated
 *                      registry cross-check was layered on top
 *   'simulated'      - fully simulated registry lookup (fixture data)
 *   'sandbox-probe'  - a real network probe against a government sandbox,
 *                      document-level result still simulated
 */
export type VerificationMethod = 'real' | 'real+simulated' | 'simulated' | 'sandbox-probe' | 'live-api';

export interface VerificationResultPayload {
  status: VerificationStatus;
  confidence: number; // 0..1
  isMock: boolean;
  /** Defaults to 'simulated' when a provider doesn't set it. */
  method?: VerificationMethod;
  raw: Record<string, unknown>;
}

export interface VerificationProvider {
  /** Matches ComplianceRequirement.sourceType */
  key: string;
  verify(input: VerificationInput): Promise<VerificationResultPayload>;
}
