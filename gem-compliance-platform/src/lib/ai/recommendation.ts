import { llmComplete, hasLLM } from './llm';
import type { RequirementEvaluation } from '../rulesEngine';

/**
 * Produces the plain-language, PO-facing recommendation the problem
 * statement explicitly asks for. This is intentionally NOT the thing
 * that decides qualification - it's a summary + gap list the Procurement
 * Officer reads before making their own call. Falls back to a
 * deterministic template if no LLM provider is configured, so the
 * dashboard is never empty.
 */
export async function generateRecommendation(params: {
  bidderName: string;
  complianceScore: number;
  riskLevel: string;
  evaluations: RequirementEvaluation[];
}): Promise<string> {
  const { bidderName, complianceScore, riskLevel, evaluations } = params;

  const gaps = evaluations.filter((e) => e.outcome !== 'MET' && e.outcome !== 'NOT_APPLICABLE');
  const gapLines = gaps.map((g) => `- ${g.label}: ${g.outcome} (${g.reason})`).join('\n');

  const template = () => {
    if (gaps.length === 0) {
      return `${bidderName} meets all configured compliance requirements for this tender (score ${complianceScore}/100, risk: ${riskLevel}). No outstanding gaps identified. Recommend proceeding to qualification review.`;
    }
    return `${bidderName} scored ${complianceScore}/100 (risk: ${riskLevel}). ${gaps.length} requirement(s) need attention before qualification:\n${gapLines}\nRecommend the Procurement Officer request clarifying documents or a formal explanation for the items above before deciding.`;
  };

  if (!hasLLM()) return template();

  try {
    const text = await llmComplete({
      maxTokens: 2000, // headroom for Gemini 3's reasoning + a 3-5 sentence answer
      prompt: `You are assisting a Government e-Marketplace (GeM) Procurement Officer at a CPSE. Write a short 3-5 sentence, plain-language compliance recommendation for the bidder below as a single paragraph (no headings, no bullet points, no markdown). Be specific about gaps, be neutral in tone, and end by reminding the reader that final qualification is their decision, not yours.

Bidder: ${bidderName}
Compliance score: ${complianceScore}/100
Risk level: ${riskLevel}
Requirement results:
${evaluations.map((e) => `- ${e.label}: ${e.outcome} (${e.reason})`).join('\n')}`,
    });
    return text.trim() || template();
  } catch (err) {
    console.warn('[ai] recommendation generation failed, using template:', err instanceof Error ? err.message : err);
    return template();
  }
}
