import type { Session } from './session';

/**
 * Role/ownership rules for the three state-changing actions, in one place so
 * the server actions (src/lib/actions.ts) and the pages that show/hide the
 * controls can't drift apart. The server actions are the real enforcement;
 * the pages use these only to decide what to render.
 *
 *   officer  - full control on every bidder
 *   bidder   - may upload only for their own company; never verifies or decides
 *   viewer   - read-only
 *   (no session) - nothing
 */

/** Can this session open / see this bidder's detail page at all? */
export function canViewBidder(session: Session | null, bidderCompanySlug: string): boolean {
  if (!session) return false;
  if (session.role === 'bidder') return session.companySlug === bidderCompanySlug;
  return true; // officer, viewer
}

/** Can this session run (or re-run) verification for a bidder? */
export function canRunVerification(session: Session | null): boolean {
  return session?.role === 'officer';
}

/** Can this session upload a document for the bidder with this company slug? */
export function canUploadDocumentFor(session: Session | null, targetCompanySlug: string | undefined): boolean {
  if (!session) return false;
  if (session.role === 'officer') return true;
  if (session.role === 'bidder') return !!targetCompanySlug && session.companySlug === targetCompanySlug;
  return false; // viewer
}

/** Can this session record the Procurement Officer's qualify/disqualify decision? */
export function canRecordDecision(session: Session | null): boolean {
  return session?.role === 'officer';
}
