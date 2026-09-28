import crypto from 'node:crypto';

/**
 * Text CAPTCHA for the sign-in screen.
 *
 * newCaptcha() returns the challenge as an inline SVG plus a signed,
 * self-contained token (HMAC-SHA256 over `{answer, exp}` using SESSION_SECRET).
 * The token travels in a hidden form field; verifyCaptcha() checks the
 * signature, the 5-minute expiry, and that the typed answer matches. No
 * server-side session store, and the plaintext answer never leaves the server.
 *
 * Not a bot-proof CAPTCHA (a determined OCR would read it) - it's a
 * deliberate human-in-the-loop step on the sign-in form, sized for a demo.
 * A real deployment would put a proper CAPTCHA / rate-limiter here.
 */

const SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me';
// No 0/O/1/I/5/S - the ambiguous pairs a person squints at.
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';
const LENGTH = 5;
const TTL_MS = 5 * 60 * 1000;

function hmac(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

export function newCaptcha(): { token: string; svg: string } {
  let answer = '';
  for (let i = 0; i < LENGTH; i++) answer += ALPHABET[crypto.randomInt(ALPHABET.length)];

  const payload = Buffer.from(JSON.stringify({ a: answer, exp: Date.now() + TTL_MS })).toString('base64url');
  const token = `${payload}.${hmac(payload)}`;
  return { token, svg: renderSvg(answer) };
}

export function verifyCaptcha(token: string | undefined | null, answer: string | undefined | null): boolean {
  if (!token || !answer) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;

  const expected = hmac(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return false;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { a?: unknown; exp?: unknown };
    if (typeof parsed.a !== 'string' || typeof parsed.exp !== 'number') return false;
    if (Date.now() > parsed.exp) return false;
    return answer.trim().toUpperCase() === parsed.a.toUpperCase();
  } catch {
    return false;
  }
}

// --- deterministic-ish inline SVG: rotated glyphs + a little line/dot noise ---

const rnd = (min: number, max: number) => min + Math.random() * (max - min);

function renderSvg(text: string): string {
  const W = 168;
  const H = 56;
  const glyphs = text
    .split('')
    .map((ch, i) => {
      const x = 20 + i * 29;
      const y = 36 + rnd(-4, 4);
      const rot = rnd(-24, 24);
      const hue = Math.round(rnd(205, 255));
      return `<text x="${x}" y="${y}" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="28" font-weight="700" fill="hsl(${hue} 55% 32%)" transform="rotate(${rot.toFixed(1)} ${x} ${y})">${ch}</text>`;
    })
    .join('');

  const lines = Array.from({ length: 4 }, () => {
    return `<line x1="${rnd(0, W).toFixed(0)}" y1="${rnd(0, H).toFixed(0)}" x2="${rnd(0, W).toFixed(0)}" y2="${rnd(0, H).toFixed(0)}" stroke="#94a3b8" stroke-width="1" opacity="0.6"/>`;
  }).join('');

  const dots = Array.from({ length: 24 }, () => {
    return `<circle cx="${rnd(0, W).toFixed(0)}" cy="${rnd(0, H).toFixed(0)}" r="1" fill="#64748b" opacity="0.5"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="CAPTCHA challenge - type the ${LENGTH} characters shown"><rect width="${W}" height="${H}" rx="8" fill="#f1f5f9"/>${lines}${dots}${glyphs}</svg>`;
}
