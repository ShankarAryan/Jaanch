import type { Role } from './session';
import { hashPassword } from './passwords';

/**
 * Demo credential store for the sign-in screen.
 *
 * Government staff (Procurement Officer, Viewer) authenticate with a fixed
 * username + password, plus the CAPTCHA (see captcha.ts).
 *
 * Passwords are compared as scrypt hashes only (passwords.ts), never
 * plaintext. The baked-in hashes below are for the documented demo
 * passwords (docs/DEMO_CREDENTIALS.md); setting an env var rotates an
 * account's password without touching code:
 *   OFFICER_PASSWORD, VIEWER_PASSWORD
 *
 * A real deployment would replace this whole module with the organisation's
 * SSO / IdP integration.
 */

export interface StaffCredential {
  username: string;
  passwordHash: string;
  role: Extract<Role, 'officer' | 'viewer'>;
  /** Display name written into the session + audit trail. */
  name: string;
}

// scrypt hashes of the documented demo passwords:
//   officer -> "Officer@2026"   viewer -> "Viewer@2026"
const BAKED = {
  officer: 'scrypt$a75b79fee84c2608ed298b068c17167b$a3a85376fd1cc7050d7f0f1f37c5d24ca054ccae19d5a15dbfae5e4e8afc283f',
  viewer: 'scrypt$8776646bad54078b9d0bac28857bc539$60531f32f289debb3209987a39b8d1e96e5b87837ee61181fafa11bb3b0fbd09',
};

const resolve = (envVal: string | undefined, baked: string) => (envVal ? hashPassword(envVal) : baked);

export const STAFF_CREDENTIALS: StaffCredential[] = [
  {
    username: 'officer',
    passwordHash: resolve(process.env.OFFICER_PASSWORD, BAKED.officer),
    role: 'officer',
    name: 'K. Shankar Aryan',
  },
  {
    username: 'viewer',
    passwordHash: resolve(process.env.VIEWER_PASSWORD, BAKED.viewer),
    role: 'viewer',
    name: 'Audit Desk',
  },
];

/** One arbitrary hash to compare against when the username is unknown, so a
 *  bad username and a bad password take about the same time. */
export const DUMMY_PASSWORD_HASH = BAKED.officer;

export function findStaff(username: string): StaffCredential | undefined {
  const u = username.trim().toLowerCase();
  return STAFF_CREDENTIALS.find((c) => c.username === u);
}
