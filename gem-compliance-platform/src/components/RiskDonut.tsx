import Link from 'next/link';

/**
 * Hand-rolled SVG ring (stroke-dasharray, no chart library) showing the real
 * LOW / MEDIUM / HIGH split of the latest Score per bidder. Colours are the
 * `risk.*` theme tokens. Degrades to a "nothing verified yet" state.
 */
export function RiskDonut({ low, medium, high }: { low: number; medium: number; high: number }) {
  const total = low + medium + high;
  const r = 16;
  const C = 2 * Math.PI * r;

  const segments =
    total === 0
      ? []
      : ([
          { v: low, cls: 'stroke-risk-low' },
          { v: medium, cls: 'stroke-risk-medium' },
          { v: high, cls: 'stroke-risk-high' },
        ] as const);

  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 40 40" className="h-24 w-24 -rotate-90">
          <circle cx="20" cy="20" r={r} fill="none" className="stroke-surface-highest" strokeWidth="6" />
          {segments.map((s, i) => {
            const len = total === 0 ? 0 : (s.v / total) * C;
            const node = (
              <circle
                key={i}
                cx="20"
                cy="20"
                r={r}
                fill="none"
                className={s.cls}
                strokeWidth="6"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return node;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-h2 font-bold leading-none text-navy">{total}</span>
          <span className="text-[10px] text-ink-faint">scored</span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs flex-1">
        {(
          [
            ['LOW', low, 'bg-risk-low', '/bidders?filter=low'],
            ['MEDIUM', medium, 'bg-risk-medium', '/bidders?filter=medium'],
            ['HIGH', high, 'bg-risk-high', '/bidders?filter=high-risk'],
          ] as const
        ).map(([label, v, dot, href]) => (
          <Link
            key={label}
            href={href}
            className="flex items-center justify-between gap-2 p-1 -mx-1 rounded hover:bg-surface-low transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
              <span className="w-16 font-medium text-ink-muted group-hover:text-navy transition-colors">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono tabular-nums text-ink font-semibold group-hover:text-navy">{v}</span>
              <span className="text-ink-faint w-10 text-right">{total === 0 ? '' : `(${Math.round((v / total) * 100)}%)`}</span>
              <span className="opacity-0 group-hover:opacity-100 text-[10px] text-navy font-bold transition-opacity">→</span>
            </div>
          </Link>
        ))}
        {total === 0 && <p className="pt-1 text-ink-faint">No bidders verified yet — run verification on a tender.</p>}
      </div>
    </div>
  );
}
