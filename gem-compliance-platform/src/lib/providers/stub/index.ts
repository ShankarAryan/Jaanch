import type { VerificationProvider, VerificationResultPayload } from '../types';

/**
 * Stub providers for sources with no realistic student-team API path
 * (MCA21, EPFO/ESIC, NSIC, Startup India - see SIH26100_Problem_Analysis.md
 * Section 3). Each returns a clearly labelled simulated result - low
 * confidence, isMock true, and a `note` explaining exactly what real
 * integration this would require - rather than pretending to be live.
 * Deterministic per bidder - hashed on the stable bidder.key, not the cuid
 * id (which is regenerated on every re-seed), so the demo profile stays the
 * same across re-seeds.
 *
 * (OEM authorization is no longer a pure stub - it has a real document-
 * content check when a certificate is uploaded; see
 * src/lib/providers/mock/oemAuthorization.ts. It still uses stubRoll below
 * for the no-document fallback.)
 */
function hashToUnit(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

/**
 * Deterministic "is this unclear?" roll for a stub-backed check.
 * true  -> flag for manual review (INCONSISTENT -> NEEDS_REVIEW)
 * false -> pass (VERIFIED_OK)
 * A stub can NEVER hard-fail - it has no live registry to assert against.
 */
export function stubRoll(bidderKey: string, providerKey: string): boolean {
  return hashToUnit(`${bidderKey}:${providerKey}`) > 0.85;
}

function makeStubProvider(key: string, roadmapNote: string): VerificationProvider {
  return {
    key,
    async verify({ bidder }): Promise<VerificationResultPayload> {
      const unclear = stubRoll(bidder.key, key);
      return {
        status: unclear ? 'INCONSISTENT' : 'VERIFIED_OK',
        confidence: 0.5,
        isMock: true,
        method: 'simulated',
        raw: {
          note: unclear
            ? `Simulated data - no live registry to verify against (production integration requires ${roadmapNote}). Flagged for manual document review, not a verified failure.`
            : `Stub provider - production integration requires ${roadmapNote}. This result is a labelled simulation, not a live check.`,
        },
      };
    },
  };
}

export const mca21Provider = makeStubProvider('mca21', 'MCA21 company-master-data API access (commercial reseller or MCA MoU)');
export const epfoEsicProvider = makeStubProvider('epfoEsic', 'EPFO/ESIC employer-compliance data sharing (no public API identified)');
export const nsicProvider = makeStubProvider('nsic', 'NSIC registration verification (certificate-based today, no public API)');
export const startupIndiaProvider = makeStubProvider('startupIndia', 'Startup India DPIIT recognition verification (certificate-based today)');
