/**
 * Real GSTIN validation - structure + the actual Mod-36 (Luhn mod N, N=36)
 * checksum GSTN uses for the 15th character. This is genuine government-
 * specified logic, not a fixture lookup: a GSTIN either passes the checksum
 * or it doesn't.
 *
 * Structure (15 chars): SS PPPPPPPPPP E Z C
 *   SS         positions 1-2   state code (01-38, or 97/99 special)
 *   PPPPPPPPPP positions 3-12  the holder's PAN
 *   E          position 13     entity code - Nth registration for that PAN
 *                              in that state (1-9, then A-Z)
 *   Z          position 14     currently always 'Z' (reserved)
 *   C          position 15     Mod-36 checksum over the first 14 chars
 *
 * Algorithm reference: Luhn mod N (en.wikipedia.org/wiki/Luhn_mod_N_algorithm).
 * Verified against real published GSTINs - see gstin.test.ts.
 */
import { validatePan } from './pan';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const N = ALPHABET.length; // 36

// State codes in use (Census 2011 based) + the two special jurisdictions.
const VALID_STATE_CODES = new Set([
  ...Array.from({ length: 38 }, (_, i) => String(i + 1).padStart(2, '0')),
  '97', // Other Territory
  '99', // Centre Jurisdiction
]);

/** Mod-36 check character for the first 14 characters of a GSTIN. */
export function gstinCheckChar(first14: string): string {
  let factor = 2;
  let sum = 0;
  for (let i = first14.length - 1; i >= 0; i--) {
    const codePoint = ALPHABET.indexOf(first14[i]);
    let addend = factor * codePoint;
    if (addend > N - 1) addend = Math.floor(addend / N) + (addend % N);
    sum += addend;
    factor = factor === 2 ? 1 : 2;
  }
  return ALPHABET[(N - (sum % N)) % N];
}

export interface GstinValidation {
  valid: boolean;
  error?: string;
  stateCode?: string;
  embeddedPan?: string;
  entityCode?: string;
  checkChar?: string;
  expectedCheckChar?: string;
}

export function validateGstin(raw: string): GstinValidation {
  const gstin = raw.trim().toUpperCase();

  if (!/^[0-9A-Z]{15}$/.test(gstin)) {
    return { valid: false, error: 'GSTIN must be exactly 15 alphanumeric characters.' };
  }

  const stateCode = gstin.slice(0, 2);
  const embeddedPan = gstin.slice(2, 12);
  const entityCode = gstin[12];
  const reserved = gstin[13];
  const checkChar = gstin[14];

  if (!VALID_STATE_CODES.has(stateCode)) {
    return { valid: false, error: `"${stateCode}" is not a valid GST state code.`, stateCode };
  }
  if (!validatePan(embeddedPan).valid) {
    return { valid: false, error: `Characters 3-12 ("${embeddedPan}") are not a valid PAN.`, embeddedPan };
  }
  if (!/^[1-9A-Z]$/.test(entityCode)) {
    return { valid: false, error: `Entity code "${entityCode}" (position 13) must be 1-9 or A-Z.`, entityCode };
  }
  if (reserved !== 'Z') {
    return { valid: false, error: `Position 14 is "${reserved}"; GSTN currently fixes this as "Z".` };
  }

  const expectedCheckChar = gstinCheckChar(gstin.slice(0, 14));
  if (checkChar !== expectedCheckChar) {
    return {
      valid: false,
      error: `Mod-36 checksum failed: 15th character is "${checkChar}", expected "${expectedCheckChar}".`,
      stateCode,
      embeddedPan,
      entityCode,
      checkChar,
      expectedCheckChar,
    };
  }

  return { valid: true, stateCode, embeddedPan, entityCode, checkChar, expectedCheckChar };
}
