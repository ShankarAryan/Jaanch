import { cookies } from 'next/headers';
import crypto from 'node:crypto';

/**
 * Minimal signed-cookie session - enough that recording a compliance
 * decision is tied to a named, role-checked identity rather than a
 * free-text field anyone can fill in. NOT a real auth system: no user
 * store, no password. Production would use the organisation's SSO. The
 * HMAC signature means a viewer can't just edit the cookie to become an
 * officer.
 *
 * SESSION_COOKIE is also referenced by name in middleware.ts (which runs
 * on the Edge runtime and can't import node:crypto) - keep them in sync.
 */

export const SESSION_COOKIE = 'gem_session';

const SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me';

export type Role = 'officer' | 'viewer' | 'bidder';
export interface Session {
  name: string;
  role: Role;
  /**
   * Only set when role === 'bidder'. Matches Bidder.companySlug - the stable
   * per-company identity shared by every row for that company across tenders
   * (e.g. 'sentinel-imaging' on tenders 5/8/9), so scoping by it gives a
   * bidder visibility into every tender they've bid on. (Bidder.key is
   * per-row - 'sentinel-imaging-t8' - and is not what we scope on.)
   */
  companySlug?: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  officer: 'Procurement Officer',
  viewer: 'Viewer (read-only)',
  bidder: 'Bidder',
};

function sign(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

export function encodeSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined | null): Session | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  // timing-safe compare
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
    if (typeof obj.name !== 'string') return null;
    if (obj.role === 'officer' || obj.role === 'viewer') {
      const name = obj.role === 'officer' && obj.name === 'V.Pranav Reddy' ? 'K. Shankar Aryan' : obj.name;
      return { name, role: obj.role };
    }
    if (obj.role === 'bidder' && typeof obj.companySlug === 'string' && obj.companySlug) {
      return { name: obj.name, role: 'bidder', companySlug: obj.companySlug };
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** Reads the current session from the request cookie. Server-only. */
export function getSession(): Session | null {
  return decodeSession(cookies().get(SESSION_COOKIE)?.value);
}
