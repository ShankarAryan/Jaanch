import 'server-only';
import crypto from 'node:crypto';

/**
 * The /admin/import tool is deliberately NOT part of the officer/viewer/bidder
 * session model - it's a backstage setup utility, not an in-app persona's
 * action. It's gated by one shared secret (ADMIN_IMPORT_SECRET) instead,
 * supplied as a `secret` query param or password field. Every page load and
 * every server action re-checks it.
 */
export function importSecretOk(supplied: string | null | undefined): boolean {
  const expected = process.env.ADMIN_IMPORT_SECRET;
  if (!expected || !supplied) return false;
  const a = Buffer.from(String(supplied));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function assertImportSecret(supplied: string | null | undefined): void {
  if (!importSecretOk(supplied)) {
    throw new Error('Unauthorized: the admin import secret is missing or wrong.');
  }
}
