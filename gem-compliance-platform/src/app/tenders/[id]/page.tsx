import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ScoreBadge } from '@/components/ScoreBadge';
import { RiskBadge } from '@/components/RiskBadge';
import { VerifyButton } from '@/components/VerifyButton';
import { getSession } from '@/lib/session';
import { canRunVerification } from '@/lib/access';
import { TenderDetailViewTabs } from '@/components/TenderDetailViewTabs';
import { BatchVerifyButton } from '@/components/BatchVerifyButton';
import { FileIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function TenderDetailPage({ params }: { params: { id: string } }) {
  const session = getSession();
  const isBidder = session?.role === 'bidder';

  const tender = await prisma.tender.findUnique({
    where: { id: params.id },
    include: {
      importBatch: { select: { id: true, filename: true, processedAt: true } },
      bidders: {
        // A bidder only ever sees their own row - scoped on the query, not hidden.
        where: isBidder ? { companySlug: session!.companySlug } : undefined,
        orderBy: { createdAt: 'asc' },
        include: {
          scores: { orderBy: { computedAt: 'desc' }, take: 1 },
          decisions: { orderBy: { decidedAt: 'desc' }, take: 1 },
          verificationResults: { orderBy: { checkedAt: 'desc' }, select: { requirementCode: true, status: true } },
          documents: {
            select: {
              id: true,
              docType: true,
              fileName: true,
              mimeType: true,
            },
          },
        },
      },
    },
  });

  if (!tender) notFound();

  const bidClosed = tender.bidEndsAt ? tender.bidEndsAt.getTime() < Date.now() : false;

  // Running verification is Procurement Officer only (enforced server-side in
  // src/lib/actions.ts). A Viewer sees the button disabled; a Bidder never
  // sees it (verification is officer/system-triggered).
  const canVerify = canRunVerification(session);
  const viewerNote = 'Read-only — only a Procurement Officer can run verification.';

  // Defends against a bidder reaching a tender they are not registered on by
  // guessing the URL (step 5 already keeps those off the dashboard).
  if (isBidder && tender.bidders.length === 0) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard" className="text-sm text-ink-muted transition-colors hover:text-navy">
          ← Back to dashboard
        </Link>
        <div className="card">
          <h2 className="font-heading text-h2 text-navy">Not a registered bidder</h2>
          <p className="mt-1 text-sm text-ink-muted">
            You are not a registered bidder on {tender.referenceNo} ({tender.title}).
          </p>
        </div>
      </div>
    );
  }

  const metaRow = (label: string, value: React.ReactNode, span2 = false) => (
    <div className={span2 ? 'sm:col-span-2' : undefined}>
      <dt className="text-label uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-ink-muted">{value}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm text-ink-muted transition-colors hover:text-navy">
        ← Back to dashboard
      </Link>

      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="mono-chip">{tender.referenceNo}</span>
            <h1 className="mt-2 font-heading text-h1 text-ink">{tender.title}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {tender.organization} · {tender.department}
            </p>
          </div>
          {tender.bidEndsAt && (
            <span className={`badge ${bidClosed ? 'badge-neutral' : 'badge-success'}`}>
              {bidClosed ? 'Bid closed' : 'Bid open'} · closes{' '}
              {tender.bidEndsAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          )}
        </div>
        <dl className="mt-4 grid gap-x-8 gap-y-3 border-t border-line pt-4 text-xs sm:grid-cols-2">
          {metaRow('Category', tender.category)}
          {metaRow('EMD / ePBG', tender.emdNote ?? (tender.emdRequired ? 'Required' : 'Not required for this tender'))}
          {tender.mseNote && metaRow('MSE / Startup', tender.mseNote, true)}
          {tender.miiNote && metaRow('Make in India', tender.miiNote, true)}
        </dl>
        {tender.importBatch ? (
          <p className="mt-3 text-[11px] text-ink-faint">
            Imported from <span className="font-medium text-ink-muted">{tender.importBatch.filename}</span> on{' '}
            {new Date(tender.importBatch.processedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            {' · '}
            <a href={`/api/import-batches/${tender.importBatch.id}/download`} className="text-navy hover:underline">
              download source file
            </a>
          </p>
        ) : (
          <p className="mt-3 text-[11px] text-ink-faint">
            Real, independently verifiable GeM bid ({tender.referenceNo}).{' '}
            {isBidder ? 'The row below is your bid.' : 'Bidders below are synthetic.'}
          </p>
        )}
      </div>

      {!isBidder && (
        <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-surface-lowest border border-line shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-navy uppercase tracking-wider">Tender Evaluation Actions:</span>
            <span className="text-xs text-ink-muted">({tender.bidders.length} participating bidders)</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/tenders/${tender.id}/executive-report`}
              className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
            >
              <FileIcon className="h-3.5 w-3.5 text-navy" />
              <span>Official Executive Report & Certificate</span>
            </Link>
            <BatchVerifyButton
              tenderId={tender.id}
              bidderCount={tender.bidders.length}
              disabled={!canVerify}
              disabledReason={canVerify ? undefined : viewerNote}
            />
          </div>
        </div>
      )}

      <TenderDetailViewTabs
        bidders={tender.bidders as any}
        tender={tender}
        canVerify={canVerify}
        isBidder={isBidder}
      >
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line bg-surface text-label uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3">{isBidder ? 'Your bid' : 'Bidder'}</th>
                  <th className="px-4 py-3">Compliance score</th>
                  <th className="px-4 py-3">Risk level</th>
                  <th className="px-4 py-3">PO decision</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {tender.bidders.map((bidder) => {
                  const latestScore = bidder.scores[0];
                  const latestDecision = bidder.decisions[0];
                  return (
                    <tr key={bidder.id} className="bidder-row border-t border-line">
                      <td className="px-4 py-3">
                        <Link
                          href={`/bidders/${bidder.id}`}
                          prefetch={true}
                          className="font-medium text-ink hover:text-navy hover:underline"
                        >
                          {bidder.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBadge score={latestScore?.complianceScore ?? null} />
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge level={latestScore?.riskLevel ?? null} />
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{latestDecision ? latestDecision.outcome : 'Pending'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isBidder && (
                            <VerifyButton
                              bidderId={bidder.id}
                              bidderName={bidder.name}
                              label={latestScore ? 'Re-verify' : 'Run Verification'}
                              disabledReason={canVerify ? undefined : viewerNote}
                              compact
                            />
                          )}
                          <Link
                            href={`/bidders/${bidder.id}`}
                            prefetch={true}
                            className="text-sm font-medium text-navy hover:underline"
                          >
                            Details →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </TenderDetailViewTabs>
    </div>
  );
}
