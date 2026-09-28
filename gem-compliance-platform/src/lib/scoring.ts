import type { RequirementEvaluation } from './rulesEngine';

export interface ScoreResult {
  complianceScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Weighted composite: mandatory requirements count for more than optional
 * ones, "needs review" costs half of a full miss (it's ambiguous, not a
 * confirmed failure). Kept as simple, explainable arithmetic on purpose -
 * see rulesEngine.ts for why eligibility logic stays out of any model.
 */
export function computeScore(evaluations: RequirementEvaluation[]): ScoreResult {
  if (evaluations.length === 0) {
    return { complianceScore: 0, riskLevel: 'HIGH' };
  }

  let earned = 0;
  let possible = 0;

  for (const evaluation of evaluations) {
    if (evaluation.outcome === 'NOT_APPLICABLE') continue; // waived for this tender - counts neither way
    const weight = evaluation.mandatory ? 2 : 1;
    possible += weight;
    if (evaluation.outcome === 'MET') earned += weight;
    else if (evaluation.outcome === 'NEEDS_REVIEW') earned += weight * 0.5;
    // NOT_MET earns 0
  }

  const complianceScore = possible === 0 ? 0 : Math.round((earned / possible) * 100);

  const hasMandatoryFailure = evaluations.some((e) => e.mandatory && e.outcome === 'NOT_MET');

  let riskLevel: ScoreResult['riskLevel'];
  if (hasMandatoryFailure || complianceScore < 50) riskLevel = 'HIGH';
  else if (complianceScore < 80) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  return { complianceScore, riskLevel };
}
