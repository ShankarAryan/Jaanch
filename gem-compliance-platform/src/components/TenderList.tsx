'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SearchIcon } from '@/components/icons';

export interface TenderRow {
  id: string;
  title: string;
  referenceNo: string;
  organization: string;
  category: string;
  documentDated: string | null; // pre-formatted on the server
  bidEndsAt: string | null; // pre-formatted on the server
  daysUntilClose: number | null; // computed on the server; null if no date or already closed
  closed: boolean;
  bidderCount: number;
}

/**
 * Client-side instant filter over the tender list already fetched by
 * dashboard/page.tsx — a real filter over the real rows, no navigation, no
 * second query. The card markup lives here (moved out of the page) so the
 * list can be interactive.
 */
export function TenderList({ tenders, isBidder }: { tenders: TenderRow[]; isBidder: boolean }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const filtered = query
    ? tenders.filter((t) =>
        [t.title, t.referenceNo, t.organization, t.category].some((f) => f.toLowerCase().includes(query)),
      )
    : tenders;

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Filter tenders"
          placeholder={isBidder ? 'Filter your tenders…' : 'Filter by title, reference number, or organisation…'}
          className="field pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="card text-sm text-ink-muted">No tenders match “{q}”.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((t) => {
            // Colour the close date by real urgency: closed stays neutral;
            // among open tenders, <=3 days reads red, <=14 days amber, further
            // out green. Same green/amber/red the status checks use elsewhere.
            const closeDateColor = t.closed
              ? 'text-ink-faint'
              : t.daysUntilClose !== null && t.daysUntilClose <= 3
                ? 'font-medium text-risk-high'
                : t.daysUntilClose !== null && t.daysUntilClose <= 14
                  ? 'font-medium text-risk-medium'
                  : 'text-indiagreen-700';
            return (
              <Link
                key={t.id}
                href={`/tenders/${t.id}`}
                prefetch={true}
                className="card group grid w-full gap-4 rounded-lg border border-line bg-surface-lowest p-4 shadow-card sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1.8fr)_minmax(0,1.1fr)_auto] sm:items-start cursor-pointer"
              >
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-ink group-hover:text-navy">{t.title}</h3>
                  <div className="mt-0.5 font-mono text-data text-navy">{t.referenceNo}</div>
                </div>

                <div className="min-w-0 text-xs text-ink-muted">
                  <div>{t.organization}</div>
                  <span className="mt-1 inline-block rounded bg-navy/10 px-2 py-0.5 text-[11px] font-medium text-navy">
                    {t.category}
                  </span>
                </div>

                <div className="text-xs text-ink-muted">
                  {t.documentDated && (
                    <div>
                      <span className="text-ink-faint">Document dated:</span> {t.documentDated}
                    </div>
                  )}
                  {t.bidEndsAt && (
                    <div className="mt-1">
                      <span className="text-ink-faint">Bid closes:</span>{' '}
                      <span className={closeDateColor}>{t.bidEndsAt}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
                  <span className={`badge ${t.closed ? 'badge-neutral' : 'badge-success'}`}>{t.closed ? 'Closed' : 'Open'}</span>
                  <span className="whitespace-nowrap text-xs text-ink-faint">
                    {isBidder ? 'You are registered' : `${t.bidderCount} ${t.bidderCount === 1 ? 'bidder' : 'bidders'}`}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {query && (
        <p className="text-xs text-ink-faint">
          {filtered.length} of {tenders.length} tenders shown
        </p>
      )}
    </div>
  );
}
