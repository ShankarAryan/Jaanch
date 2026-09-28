import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import Link from 'next/link';
import { LayersIcon, SearchIcon, FileIcon, UsersIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default async function TendersDirectoryPage() {
  const session = getSession();
  const isBidder = session?.role === 'bidder';
  const companySlug = isBidder ? session!.companySlug : undefined;

  const tenders = await prisma.tender.findMany({
    where: isBidder ? { bidders: { some: { companySlug } } } : undefined,
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { bidders: true, requirements: true } },
    },
  });

  const totalBidders = tenders.reduce((acc, t) => acc + t._count.bidders, 0);
  const openCount = tenders.filter((t) => t.bidEndsAt && t.bidEndsAt.getTime() >= Date.now()).length;
  const closedCount = tenders.length - openCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <LayersIcon className="h-6 w-6 text-navy" />
            <h1 className="font-heading text-2xl font-bold text-navy">
              {isBidder ? 'Registered Tenders' : 'GeM Bids & Tenders'}
            </h1>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {isBidder
              ? `Review compliance requirements and participate in bids registered to your company profile.`
              : `Directory of authentic Government e-Marketplace tenders with configured statutory compliance matrices.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-line bg-surface-lowest px-3 py-1.5 text-xs text-ink">
            <span className="font-semibold text-navy">{tenders.length}</span> Bids Loaded
          </span>
          <span className="rounded-md border border-line bg-surface-lowest px-3 py-1.5 text-xs text-indiagreen-700">
            <span className="font-semibold">{openCount}</span> Active
          </span>
          <span className="rounded-md border border-line bg-surface-lowest px-3 py-1.5 text-xs text-ink-faint">
            <span className="font-semibold">{closedCount}</span> Closed
          </span>
        </div>
      </div>

      {/* Grid of Tender Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {tenders.map((t) => {
          const isClosed = t.bidEndsAt ? t.bidEndsAt.getTime() < Date.now() : false;
          return (
            <div
              key={t.id}
              className="card flex flex-col justify-between rounded-lg border border-line bg-surface-lowest p-5 shadow-card"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded bg-navy/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-navy">
                    {t.referenceNo}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      isClosed
                        ? 'bg-surface-high text-ink-faint'
                        : 'bg-indiagreen/10 text-indiagreen-700 border border-indiagreen/30'
                    }`}
                  >
                    {isClosed ? 'Closed' : 'Active Bid'}
                  </span>
                </div>

                <h3 className="mt-2.5 font-heading text-base font-bold text-ink leading-snug">
                  {t.title}
                </h3>
                <p className="mt-1 text-xs text-ink-muted line-clamp-2">{t.organization}</p>
                <p className="text-[11px] text-ink-faint mt-0.5">{t.department}</p>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line/60 pt-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-ink-faint block">Category</span>
                    <span className="font-medium text-ink truncate block">{t.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-ink-faint block">Closing Date</span>
                    <span className="font-medium text-ink truncate block">
                      {t.bidEndsAt ? fmtDate(t.bidEndsAt) : 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-ink-faint block">EMD Required</span>
                    <span className="font-medium text-ink block">
                      {t.emdRequired ? 'Yes (Bank BG/ePBG)' : 'Exempted / Not Required'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-ink-faint block">Bidders Registered</span>
                    <span className="font-medium text-navy block">
                      {isBidder ? 'Your company' : `${t._count.bidders} Participating`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-line flex items-center justify-between">
                <span className="text-xs text-ink-faint">
                  {t._count.requirements} statutory checks configured
                </span>
                <Link
                  href={`/tenders/${t.id}`}
                  prefetch={true}
                  className="rounded bg-navy px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-navy-700 transition-colors"
                >
                  Open Tender Terminal →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
