import { CheckIcon, DashIcon } from './icons';

export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="badge badge-neutral">
        <DashIcon />
        Not yet verified
      </span>
    );
  }
  // Saffron-800 — the brand primary; white text clears AA on this shade.
  // Deliberately off the green/amber/red danger axis (that's RiskBadge).
  return (
    <span className="badge bg-saffron-800 font-semibold text-white">
      <CheckIcon />
      {score}/100
    </span>
  );
}
