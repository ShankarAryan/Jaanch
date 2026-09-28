import type { VerificationStatus } from './providers/types';

export type RequirementOutcome = 'MET' | 'NOT_MET' | 'NEEDS_REVIEW' | 'NOT_APPLICABLE';

export interface RequirementEvaluation {
  code: string;
  label: string;
  mandatory: boolean;
  sourceStatus: VerificationStatus;
  outcome: RequirementOutcome;
  reason: string;
}

/**
 * Deterministic, explainable, tender-configurable rules - deliberately
 * NOT a model. A procurement decision needs to be auditable ("why was
 * this bidder flagged"), so eligibility logic stays as plain rules the
 * team can read and defend, while the AI layer is reserved for document
 * understanding, anomaly detection, and recommendation text (see
 * SIH26100_Problem_Analysis.md, Section 5).
 */
export function evaluateRequirement(params: {
  code: string;
  label: string;
  mandatory: boolean;
  sourceType: string;
  ruleConfig: Record<string, unknown>;
  verification: { status: VerificationStatus; raw: Record<string, unknown> };
}): RequirementEvaluation {
  const { code, label, mandatory, sourceType, ruleConfig, verification } = params;
  const { status, raw } = verification;

  // A tender can declare a requirement not applicable to it (e.g. a Make in
  // India local-content check on a global tender where the competent
  // authority has approved that the items are not available domestically).
  // This is tender configuration, not a verification result - it short-
  // circuits before any provider outcome is considered, and scoring skips it.
  if (ruleConfig.notApplicable === true) {
    return {
      code,
      label,
      mandatory,
      sourceStatus: status,
      outcome: 'NOT_APPLICABLE',
      reason: (ruleConfig.waiverBasis as string) ?? 'This requirement does not apply to the current tender.',
    };
  }

  if (status === 'ERROR') {
    return { code, label, mandatory, sourceStatus: status, outcome: 'NEEDS_REVIEW', reason: 'Verification check failed to complete.' };
  }
  if (status === 'MISSING') {
    return {
      code,
      label,
      mandatory,
      sourceStatus: status,
      outcome: mandatory ? 'NOT_MET' : 'NEEDS_REVIEW',
      reason: 'Required information or document was not supplied by the bidder.',
    };
  }
  if (status === 'INCONSISTENT') {
    return {
      code,
      label,
      mandatory,
      sourceStatus: status,
      outcome: 'NEEDS_REVIEW',
      reason: (raw.note as string) ?? 'Portal/document data is inconsistent with bidder-supplied information.',
    };
  }
  if (status === 'VERIFIED_FAIL') {
    return { code, label, mandatory, sourceStatus: status, outcome: 'NOT_MET', reason: (raw.note as string) ?? 'Verification failed against source registry.' };
  }

  // status === 'VERIFIED_OK' - apply any additional tender-specific thresholds.
  if (sourceType === 'udyam' && Array.isArray(ruleConfig.allowedCategories)) {
    const category = raw.category as string | undefined;
    if (category && !ruleConfig.allowedCategories.includes(category)) {
      return {
        code,
        label,
        mandatory,
        sourceStatus: status,
        outcome: 'NOT_MET',
        reason: `Udyam category "${category}" is not in the categories eligible for this tender (${(ruleConfig.allowedCategories as string[]).join(', ')}).`,
      };
    }
  }

  if (sourceType === 'gst' && typeof ruleConfig.maxFilingDelayMonths === 'number') {
    const delay = raw.returnFilingDelayMonths as number | undefined;
    if (typeof delay === 'number' && delay > (ruleConfig.maxFilingDelayMonths as number)) {
      return {
        code,
        label,
        mandatory,
        sourceStatus: status,
        outcome: 'NOT_MET',
        reason: `GST returns are ${delay} month(s) behind, exceeding the ${ruleConfig.maxFilingDelayMonths}-month limit for this tender.`,
      };
    }
  }

  if (sourceType === 'makeInIndia' && typeof ruleConfig.minLocalContentPercent === 'number') {
    const verifiedPercent = (raw.verifiedPercent ?? raw.declaredPercent) as number | undefined;
    if (typeof verifiedPercent === 'number' && verifiedPercent < (ruleConfig.minLocalContentPercent as number)) {
      return {
        code,
        label,
        mandatory,
        sourceStatus: status,
        outcome: 'NOT_MET',
        reason: `Verified local content (${verifiedPercent}%) is below the ${ruleConfig.minLocalContentPercent}% required for this tender category.`,
      };
    }
  }

  // MET - surface the provider's own note (what it actually checked) when it
  // has one, so every passing row still explains itself; generic otherwise.
  const metReason = typeof raw.note === 'string' && raw.note.trim() ? raw.note : 'Verified and within tender-specific thresholds.';
  return { code, label, mandatory, sourceStatus: status, outcome: 'MET', reason: metReason };
}
