import crypto from 'node:crypto';

/**
 * Password hashing for the sign-in credentials. scrypt (Node built-in, no
 * dependency) with a per-hash random salt. Stored form: `scrypt$<saltHex>$<hashHex>`.
 *
 * This is a demo credential store (see authConfig.ts) - a production
 * deployment would use the organisation's SSO / identity provider - but the
 * hashing itself is done properly: salted, constant-time comparison, so a
 * leaked config file doesn't hand over the plaintext passwords.
 */

const KEYLEN = 32;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(plain, salt, KEYLEN, SCRYPT_PARAMS);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[1], 'hex');
    expected = Buffer.from(parts[2], 'hex');
  } catch {
    return false;
  }
  if (expected.length === 0) return false;
  const derived = crypto.scryptSync(plain, salt, expected.length, SCRYPT_PARAMS);
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}
