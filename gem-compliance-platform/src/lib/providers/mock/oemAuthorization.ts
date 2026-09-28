import type { OemAuthorizationExtraction } from '@/lib/ai/documentExtraction';
import { stubRoll } from '../stub';
import type { VerificationProvider, VerificationResultPayload } from '../types';

/**
 * Hybrid, same pattern as GST/PAN:
 *   - MISSING (real) when no OEM_AUTHORIZATION_CERTIFICATE was uploaded at
 *     all - checking whether a required document is present is a
 *     deterministic real check, same as gst.ts/pan.ts treat a missing
 *     GSTIN/PAN. Flows through rulesEngine as mandatory ? NOT_MET :
 *     NEEDS_REVIEW.
 *   - REAL when an OEM_AUTHORIZATION_CERTIFICATE has been uploaded - the
 *     multimodal LLM (a) checks the document plausibly reads as an OEM
 *     authorization letter and (b) extracts the OEM + authorised-bidder
 *     names, and this provider cross-checks the authorised name against the
 *     bidder. This is a genuine document-content check, not a coin flip.
 *   - SIMULATED fallback (stubRoll) ONLY when a document WAS uploaded but the
 *     automated read is inconclusive - there is no live OEM-issuer registry
 *     to query. Can only pass or flag for review, never hard-fail.
 *
 * What the real check does NOT do: verify the letter is genuinely from the
 * OEM (no issuer to call). That stays a manual / future step.
 */

const ROADMAP = 'OEM authorization letter issuer verification (manual / document-based today)';

const COMPANY_STOPWORDS = new Set([
  'pvt', 'private', 'ltd', 'limited', 'llp', 'inc', 'incorporated', 'co', 'company', 'corp', 'corporation',
  'and', 'the', 'india', 'indian', 'm', 's', 'ms',
  'technologies', 'technology', 'solutions', 'systems', 'enterprises', 'services', 'industries', 'group',
]);

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !COMPANY_STOPWORDS.has(t));
}

/** Fuzzy: do the distinctive tokens of the two names overlap enough? */
function namesRoughlyMatch(a: string, b: string): boolean {
  const ta = new Set(nameTokens(a));
  const tb = new Set(nameTokens(b));
  if (ta.size === 0 || tb.size === 0) return true; // nothing distinctive to compare on
  const [small, big] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  let hits = 0;
  for (const t of small) if (big.has(t)) hits++;
  return hits / small.size >= 0.6;
}

export const oemAuthorizationProvider: VerificationProvider = {
  key: 'oemAuthorization',
  async verify({ bidder, documents }): Promise<VerificationResultPayload> {
    const doc = documents.find((d) => d.docType === 'OEM_AUTHORIZATION_CERTIFICATE');

    // --- REAL: no OEM authorization certificate uploaded at all. Presence of
    // a required document is a deterministic check (same as gst.ts/pan.ts do
    // for a missing GSTIN/PAN), not a simulation - so isMock:false / 'real'.
    // rulesEngine turns MISSING into NOT_MET for a mandatory requirement. ---
    if (!doc) {
      return {
        status: 'MISSING',
        confidence: 1,
        isMock: false,
        method: 'real',
        raw: { note: 'No OEM authorization certificate uploaded by the bidder.' },
      };
    }

    const ex = doc.extractedData as OemAuthorizationExtraction | null | undefined;

    // --- REAL: a document was uploaded and the LLM could read it ---
    if (ex && typeof ex.looksLikeOemAuthLetter === 'boolean') {
      if (!ex.looksLikeOemAuthLetter) {
        return {
          status: 'INCONSISTENT',
          confidence: 0.9,
          isMock: false,
          method: 'real',
          raw: {
            note:
              'The uploaded document does not appear to be an OEM authorization letter. An OEM authorization letter names the manufacturer and authorises this bidder to supply / resell their products — please check the file that was uploaded.',
          },
        };
      }

      if (ex.authorizedBidderName && !namesRoughlyMatch(ex.authorizedBidderName, bidder.name)) {
        return {
          status: 'INCONSISTENT',
          confidence: 0.85,
          isMock: false,
          method: 'real',
          raw: {
            oemName: ex.oemName,
            authorizedBidderName: ex.authorizedBidderName,
            note: `The OEM authorization letter authorises "${ex.authorizedBidderName}", which does not clearly match the bidder "${bidder.name}". Confirm the letter belongs to this bidder.`,
          },
        };
      }

      return {
        status: 'VERIFIED_OK',
        confidence: 0.85,
        isMock: false,
        method: 'real',
        raw: {
          oemName: ex.oemName,
          authorizedBidderName: ex.authorizedBidderName,
          note: `Uploaded document reads as an OEM authorization letter${ex.oemName ? ` from ${ex.oemName}` : ''}${
            ex.authorizedBidderName ? `, authorising ${ex.authorizedBidderName}` : ''
          }. Content-plausibility check only — the letter's authenticity is not verified against the OEM.`,
        },
      };
    }

    // --- SIMULATED fallback: a document WAS uploaded, but the automated read
    // is inconclusive (no AI provider configured, or the multimodal read
    // failed). Genuine uncertainty with no live OEM-issuer registry to check
    // the letter against — can only pass or flag for review, never hard-fail. ---
    const unclear = stubRoll(bidder.key, 'oemAuthorization');
    return {
      status: unclear ? 'INCONSISTENT' : 'VERIFIED_OK',
      confidence: 0.5,
      isMock: true,
      method: 'simulated',
      raw: {
        note: unclear
          ? `An OEM authorization certificate was uploaded but could not be read automatically, and there is no live OEM-issuer registry to query (production integration requires ${ROADMAP}). Flagged for manual document review, not a verified failure.`
          : `An OEM authorization certificate was uploaded but could not be read automatically. Simulated result — production integration requires ${ROADMAP}. Labelled simulation, not a live check.`,
      },
    };
  },
};
