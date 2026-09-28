import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { TimelineIcon, ShieldCheckIcon } from '@/components/icons';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const fmtTimestamp = (d: Date) =>
  d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export default async function AuditLogsPage() {
  const session = getSession();

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: {
      bidder: {
        select: {
          id: true,
          name: true,
          companySlug: true,
          tender: { select: { id: true, referenceNo: true, title: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TimelineIcon className="h-6 w-6 text-navy" />
            <h1 className="font-heading text-2xl font-bold text-navy">Central Procurement Audit Trail</h1>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Immutable, cryptographically verifiable log of all statutory checks, score calculations, and officer qualification decisions.
          </p>
        </div>
        <span className="rounded-md border border-line bg-surface-lowest px-3 py-1.5 text-xs text-ink">
          <strong className="text-navy">{logs.length}</strong> Events Logged
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="card text-center py-12">
          <ShieldCheckIcon className="mx-auto h-10 w-10 text-ink-faint" />
          <h3 className="mt-3 font-heading text-base font-semibold text-navy">No Audit Events Yet</h3>
          <p className="mt-1 text-xs text-ink-muted max-w-md mx-auto">
            Audit trail logs are generated automatically when verifications are run on bidders or when decisions are recorded by a Procurement Officer.
          </p>
          <div className="mt-4">
            <Link
              href="/tenders"
              className="inline-block rounded bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-700"
            >
              Open a Tender to Run Verification →
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface-lowest shadow-card">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface-low/50 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-3 py-3">Actor / Authority</th>
                <th className="px-3 py-3">Action Type</th>
                <th className="px-3 py-3">Bidder & Tender Context</th>
                <th className="px-4 py-3">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 font-mono text-[11px]">
              {logs.map((log) => {
                let parsedDetails = null;
                try {
                  parsedDetails = JSON.parse(log.details);
                } catch {
                  parsedDetails = log.details;
                }

                return (
                  <tr key={log.id} className="hover:bg-surface-low/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-ink-faint text-[11px]">
                      {fmtTimestamp(log.createdAt)}
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap font-sans">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          log.actor === 'SYSTEM'
                            ? 'bg-navy/10 text-navy'
                            : log.actor === 'AI_ENGINE'
                              ? 'bg-indigo/10 text-indigo'
                              : 'bg-saffron/10 text-saffron-800'
                        }`}
                      >
                        {log.actor}
                      </span>
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap font-semibold text-ink">
                      {log.action}
                    </td>

                    <td className="px-3 py-3 font-sans">
                      {log.bidder ? (
                        <div>
                          <Link
                            href={`/bidders/${log.bidder.id}`}
                            className="font-semibold text-navy hover:underline block"
                          >
                            {log.bidder.name}
                          </Link>
                          {log.bidder.tender && (
                            <span className="text-[10px] text-ink-faint block font-mono">
                              {log.bidder.tender.referenceNo}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-ink-faint italic">System-wide</span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px] text-ink-muted max-w-md">
                      <div className="line-clamp-2 bg-surface-high/40 rounded p-1.5 overflow-x-auto text-[10px]">
                        {typeof parsedDetails === 'object' ? JSON.stringify(parsedDetails) : String(parsedDetails)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
