/**
 * Single-value compliance-score ring for the bidder detail right rail.
 * Pure presentation over the real latestScore.complianceScore / riskLevel
 * already fetched by bidders/[id]/page.tsx - no new data path. Hand-rolled
 * SVG (stroke-dasharray), no chart library. Ring colour is the risk axis:
 * LOW → green, MEDIUM → amber, HIGH → red.
 */
const ringClass: Record<string, string> = {
  LOW: 'text-risk-low',
  MEDIUM: 'text-risk-medium',
  HIGH: 'text-risk-high',
};
const riskLabel: Record<string, string> = {
  LOW: 'Low-risk bidder',
  MEDIUM: 'Medium-risk bidder',
  HIGH: 'High-risk bidder',
};

export function ScoreDonut({ score, riskLevel }: { score: number; riskLevel: string }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="text-center">
      <p className="text-label uppercase tracking-wider text-ink-muted">Compliance score</p>
      <div className="relative mx-auto mt-3 flex h-32 w-32 items-center justify-center">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <path
            className="text-surface-highest"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={ringClass[riskLevel] ?? 'text-navy'}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${pct}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-h1 font-bold leading-none text-navy">{score}</span>
          <span className="text-[10px] text-ink-faint">/ 100</span>
        </div>
      </div>
      <p className={`mt-3 text-sm font-medium ${riskLevel === 'HIGH' ? 'text-risk-high' : riskLevel === 'MEDIUM' ? 'text-risk-medium' : 'text-indiagreen-700'}`}>
        {riskLabel[riskLevel] ?? riskLevel}
      </p>
    </div>
  );
}
