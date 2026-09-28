import { CheckIcon, DotIcon, DashIcon } from './icons';

// Colour logic unchanged — the danger axis maps LOW → success (green),
// MEDIUM → warning (amber), HIGH → critical (red). Expressed via the shared
// .badge-* classes from globals.css so every status chip in the app matches.
const styles: Record<string, string> = {
  LOW: 'badge-success',
  MEDIUM: 'badge-warning',
  HIGH: 'badge-critical',
};

const icons: Record<string, JSX.Element> = {
  LOW: <CheckIcon />,
  MEDIUM: <DotIcon />,
  HIGH: <DotIcon />,
};

export function RiskBadge({ level }: { level: string | null }) {
  if (!level) {
    return (
      <span className="badge badge-neutral">
        <DashIcon />—
      </span>
    );
  }
  return (
    <span className={`badge ${styles[level] ?? 'badge-neutral'}`}>
      {icons[level] ?? <DotIcon />}
      {level} RISK
    </span>
  );
}
