/**
 * Real PAN structural validation, per the Income Tax Department's specified
 * format. This is genuine format logic, not a fixture lookup - but note its
 * limit: it confirms a PAN is *well-formed and correctly typed*, NOT that it
 * is *registered*. Confirming registration needs the Income Tax "Verify PAN"
 * database, which has no open API (see SIH26100_Problem_Analysis.md §3).
 *
 * Format (10 chars): AAAAA 9999 A
 *   1-3   alphabetic series (AAA-ZZZ)
 *   4     holder type (see PAN_HOLDER_TYPES)
 *   5     first character of the holder's surname / entity name
 *   6-9   sequential number 0001-9999
 *   10    an alphabetic check character - the Income Tax Dept does NOT
 *         publish its derivation, so we validate that it IS a letter but
 *         cannot verify it. We do not claim a checksum result for PAN.
 */

export const PAN_HOLDER_TYPES: Record<string, string> = {
  P: 'Individual',
  C: 'Company',
  H: 'Hindu Undivided Family (HUF)',
  F: 'Firm / LLP',
  A: 'Association of Persons (AOP)',
  T: 'Trust',
  B: 'Body of Individuals (BOI)',
  L: 'Local Authority',
  J: 'Artificial Juridical Person',
  G: 'Government',
};

export interface PanValidation {
  valid: boolean;
  error?: string;
  holderTypeCode?: string;
  holderType?: string;
}

export function validatePan(raw: string): PanValidation {
  const pan = raw.trim().toUpperCase();

  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    return { valid: false, error: 'PAN must be 5 letters, then 4 digits, then 1 letter (e.g. ABCDE1234F).' };
  }

  const holderTypeCode = pan[3];
  const holderType = PAN_HOLDER_TYPES[holderTypeCode];
  if (!holderType) {
    return {
      valid: false,
      error: `4th character "${holderTypeCode}" is not a recognised PAN holder type (P, C, H, F, A, T, B, L, J, G).`,
      holderTypeCode,
    };
  }

  return { valid: true, holderTypeCode, holderType };
}
