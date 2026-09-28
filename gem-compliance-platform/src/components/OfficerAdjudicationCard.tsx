import Link from 'next/link';
import { ShieldCheckIcon, ClipboardIcon, CheckIcon } from '@/components/icons';

export interface PendingBidderItem {
  id: string;
  name: string;
  tenderRef: string;
  score: number;
  riskLevel: string;
  aiRecommendation: string;
}

interface Props {
  totalScored: number;
  qualified: number;
  conditional: number;
  disqualified: number;
  awaitingReview: number;
  pendingBidders: PendingBidderItem[];
}

export function OfficerAdjudicationCard({
  totalScored,
  qualified,
  conditional,
  disqualified,
  awaitingReview,
  pendingBidders,
}: Props) {
  const totalDecided = qualified + conditional + disqualified;
  const total = totalScored;
  const r = 16;
  const C = 2 * Math.PI * r;

  const segments =
    total === 0
      ? []
      : [
          { v: qualified, cls: 'stroke-indiagreen-700' },
          { v: conditional, cls: 'stroke-saffron-700' },
          { v: disqualified, cls: 'stroke-critical' },
          { v: awaitingReview, cls: 'stroke-navy' },
        ];

  let offset = 0;

  return (
    <div className="card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-line">
          <h3 className="section-title mb-0 flex items-center gap-2">
            <ShieldCheckIcon className="h-4 w-4 text-navy" />
            Officer Adjudication Status
          </h3>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-navy bg-navy/5 px-2 py-0.5 rounded border border-navy/20">
            Human-in-the-Loop
          </span>
        </div>
        <p className="text-xs text-ink-muted mb-4">
          Statutory qualification sign-offs by the Procurement Officer under CVC Rule 4.2 & GeM GTC.
        </p>

        {/* Donut Chart & Legend */}
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
              <span className="font-heading text-h2 font-bold leading-none text-navy">{totalDecided}</span>
              <span className="text-[9px] text-ink-faint mt-0.5">signed off</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs flex-1">
            {[
              { label: 'Qualified', count: qualified, color: 'bg-indiagreen-700', href: '/bidders?filter=qualified' },
              { label: 'Conditional', count: conditional, color: 'bg-saffron-700', href: '/bidders?filter=adjudication' },
              { label: 'Disqualified', count: disqualified, color: 'bg-critical', href: '/bidders?filter=adjudication' },
              { label: 'Awaiting Sign-off', count: awaitingReview, color: 'bg-navy', href: '/bidders?filter=pending' },
            ].map(({ label, count, color, href }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center justify-between gap-2 p-1 -mx-1 rounded hover:bg-surface-low transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
                  <span className="font-medium text-ink-muted group-hover:text-navy transition-colors">{label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono tabular-nums text-ink font-semibold group-hover:text-navy">{count}</span>
                  <span className="text-ink-faint w-10 text-right">
                    {total === 0 ? '—' : `(${Math.round((count / total) * 100)}%)`}
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 text-[10px] text-navy font-bold transition-opacity">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Actionable Review Queue or Clean State */}
      <div className="mt-4 pt-3.5 border-t border-line/60">
        {pendingBidders.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
                <ClipboardIcon className="h-3.5 w-3.5 text-navy" />
                Action Queue: {pendingBidders.length} {pendingBidders.length === 1 ? 'Bidder' : 'Bidders'} Awaiting Decision
              </span>
              <span className="text-[10px] text-saffron-800 font-medium">PO Adjudication Required</span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {pendingBidders.map((b) => (
                <div
                  key={b.id}
                  className="bidder-item p-2 rounded-md bg-surface border border-line/70 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-xs text-navy truncate">{b.name}</span>
                      <span
                        className={`badge text-[9px] py-0 px-1.5 ${
                          b.riskLevel === 'HIGH'
                            ? 'badge-critical'
                            : b.riskLevel === 'MEDIUM'
                              ? 'badge-warning'
                              : 'badge-success'
                        }`}
                      >
                        {b.riskLevel} · {b.score}%
                      </span>
                    </div>
                    <span className="text-[10px] text-ink-faint block truncate">{b.tenderRef}</span>
                  </div>
                  <Link
                    href={`/bidders/${b.id}`}
                    className="shrink-0 text-xs font-semibold text-navy hover:text-saffron-800 bg-surface-container px-2.5 py-1 rounded border border-line flex items-center gap-1 transition-colors"
                  >
                    Adjudicate →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-indiagreen-700 py-1">
            <CheckIcon className="h-4 w-4 shrink-0" />
            <span>All AI-screened bidders have received verified decisions by the Procurement Officer.</span>
          </div>
        )}
      </div>
    </div>
  );
}
