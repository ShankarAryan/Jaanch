# Demo sign-in credentials

The sign-in screen (`/sign-in`) asks for a username + password **plus a
CAPTCHA** every time. Access is restricted to government procurement staff.

| Account | ID | Password |
| --- | --- | --- |
| Procurement Officer | `officer` | `Officer@2026` |
| Viewer (read-only) | `viewer` | `Viewer@2026` |

Notes:

- Usernames are case-insensitive. The CAPTCHA is case-insensitive too.
- Passwords are stored only as scrypt hashes (`src/lib/authConfig.ts`,
  hashing in `src/lib/passwords.ts`). To change one without editing code,
  set an env var and restart:
  - `OFFICER_PASSWORD`
  - `VIEWER_PASSWORD`
- The CAPTCHA token is an HMAC (keyed by `SESSION_SECRET`) with a 5-minute
  expiry — no server-side session store. This is a human-in-the-loop step
  sized for the demo, not a bot-proof CAPTCHA.
- This is a demo credential store. A production deployment would replace
  `authConfig.ts` with the organisation's SSO / identity provider.
