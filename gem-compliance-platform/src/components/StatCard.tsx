import Link from 'next/link';

/**
 * KPI stat card — icon chip top-left, optional small badge top-right, big
 * number, label below. Supports optional `href` to make the card an interactive link.
 */
export function StatCard({
  icon,
  value,
  label,
  badge,
  badgeTone = 'slate',
  href,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  badge?: string;
  badgeTone?: 'slate' | 'green' | 'amber' | 'saffron';
  href?: string;
}) {
  const badgeStyles: Record<string, string> = {
    slate: 'badge-neutral',
    green: 'badge-success',
    amber: 'badge-warning',
    saffron: 'badge-warning',
  };

  const content = (
    <>
      <div className="flex items-start justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-navy/10 text-navy transition-colors group-hover:bg-navy group-hover:text-white">
          {icon}
        </span>
        <div className="flex items-center gap-1">
          {badge && <span className={`badge ${badgeStyles[badgeTone]}`}>{badge}</span>}
          {href && (
            <span className="opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-navy text-xs font-bold">
              →
            </span>
          )}
        </div>
      </div>
      <div>
        <div className="font-heading text-h2 font-semibold leading-none text-navy group-hover:text-navy transition-colors">
          {value}
        </div>
        <div className="mt-1.5 text-xs text-ink-muted flex items-center justify-between">
          <span>{label}</span>
          {href && (
            <span className="text-[10px] text-navy font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              View →
            </span>
          )}
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="card flex flex-col gap-3 transition-all hover:border-navy/50 hover:shadow-card-hover group cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  return <div className="card flex flex-col gap-3">{content}</div>;
}
