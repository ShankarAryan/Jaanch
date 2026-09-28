import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { StatCard } from '@/components/StatCard';
import { RiskDonut } from '@/components/RiskDonut';
import { TenderList, type TenderRow } from '@/components/TenderList';
import { GridIcon, UsersIcon, ShieldCheckIcon, FileIcon, SparkIcon } from '@/components/icons';
import { HybridAiArchitectureShowcase } from '@/components/HybridAiArchitectureShowcase';
import { OfficerAdjudicationCard, type PendingBidderItem } from '@/components/OfficerAdjudicationCard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default async function DashboardPage() {
  const session = getSession();
  const isBidder = session?.role === 'bidder';
  const companySlug = isBidder ? session!.companySlug : undefined;

  // A bidder only ever sees tenders they are actually registered on - filter
  // on the query itself, not a UI hide.
  const tenders = await prisma.tender.findMany({
    where: isBidder ? { bidders: { some: { companySlug } } } : undefined,
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { bidders: true } } },
  });

  const companyName = isBidder
    ? (await prisma.bidder.findFirst({ where: { companySlug }, select: { name: true } }))?.name ?? 'Your company'
    : null;

  // --- KPI numbers, all straight from Prisma ---
  // Latest Score per bidder (scoped for a bidder). One row per bidderId, newest first.
  const scoreRows = await prisma.score.findMany({
    where: isBidder ? { bidder: { companySlug } } : undefined,
    orderBy: { computedAt: 'desc' },
    select: { bidderId: true, riskLevel: true },
  });
  const latestRiskByBidder = new Map<string, string>();
  for (const s of scoreRows) if (!latestRiskByBidder.has(s.bidderId)) latestRiskByBidder.set(s.bidderId, s.riskLevel);
  const verifiedCount = latestRiskByBidder.size;
  const dist = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const r of latestRiskByBidder.values()) if (r === 'LOW' || r === 'MEDIUM' || r === 'HIGH') dist[r]++;

  // Officer decisions per bidder
  const decisionRows = await prisma.decision.findMany({
    where: isBidder ? { bidder: { companySlug } } : undefined,
    orderBy: { decidedAt: 'desc' },
    select: { bidderId: true, outcome: true },
  });
  const latestDecisionByBidder = new Map<string, string>();
  for (const d of decisionRows) {
    if (!latestDecisionByBidder.has(d.bidderId)) {
      latestDecisionByBidder.set(d.bidderId, d.outcome);
    }
  }

  let officerQualified = 0;
  let officerConditional = 0;
  let officerDisqualified = 0;
  let awaitingOfficerReview = 0;

  for (const bidderId of latestRiskByBidder.keys()) {
    const outcome = latestDecisionByBidder.get(bidderId);
    if (!outcome) {
      awaitingOfficerReview++;
    } else if (outcome === 'QUALIFIED') {
      officerQualified++;
    } else if (outcome === 'CONDITIONAL') {
      officerConditional++;
    } else if (outcome === 'DISQUALIFIED') {
      officerDisqualified++;
    }
  }
  const totalDecided = officerQualified + officerConditional + officerDisqualified;

  // Pending officer action queue (scored bidders that have no decision yet)
  const pendingBiddersRaw = !isBidder
    ? await prisma.bidder.findMany({
        where: {
          id: { in: Array.from(latestRiskByBidder.keys()) },
          decisions: { none: {} },
        },
        include: {
          tender: { select: { referenceNo: true, title: true } },
          scores: { orderBy: { computedAt: 'desc' }, take: 1 },
        },
        take: 5,
      })
    : [];

  const pendingBiddersList: PendingBidderItem[] = pendingBiddersRaw.map((b) => ({
    id: b.id,
    name: b.name,
    tenderRef: b.tender.referenceNo,
    score: Math.round(b.scores[0]?.complianceScore ?? 0),
    riskLevel: b.scores[0]?.riskLevel ?? 'LOW',
    aiRecommendation: b.scores[0]?.aiRecommendation ?? '',
  }));

  const totalBidders = tenders.reduce((s, t) => s + t._count.bidders, 0); // officer only - includes competitors
  const myDocs = isBidder ? await prisma.document.count({ where: { bidder: { companySlug } } }) : 0;

  if (tenders.length === 0) {
    return (
      <div className="card">
        <h2 className="font-heading text-h2 text-navy">{isBidder ? 'No tenders' : 'No tenders loaded'}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {isBidder ? (
            'Your company is not currently registered as a bidder on any tender.'
          ) : (
            <>
              Run <code className="rounded bg-surface-container px-1 py-0.5 font-mono text-xs">npm run seed</code> to load the demo tenders.
            </>
          )}
        </p>
      </div>
    );
  }

  const rows: TenderRow[] = tenders.map((t) => {
    const closed = t.bidEndsAt ? t.bidEndsAt.getTime() < Date.now() : false;
    return {
      id: t.id,
      title: t.title,
      referenceNo: t.referenceNo,
      organization: t.organization,
      category: t.category,
      documentDated: t.documentDated ? fmtDate(t.documentDated) : null,
      bidEndsAt: t.bidEndsAt ? fmtDate(t.bidEndsAt) : null,
      // Days until the bid window shuts - drives the urgency colour on the
      // close date. null when there's no date or the tender is already closed.
      daysUntilClose:
        t.bidEndsAt && !closed ? Math.ceil((t.bidEndsAt.getTime() - Date.now()) / 86400000) : null,
      closed,
      bidderCount: t._count.bidders,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-h1 text-navy">{isBidder ? 'Your tenders' : 'Tenders'}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isBidder ? (
            <>
              The {tenders.length} GeM {tenders.length === 1 ? 'bid' : 'bids'} {companyName} is registered on. Click one to
              see your compliance status and upload documents.
            </>
          ) : (
            <>
              {tenders.length} real, independently verifiable GeM bids. Click a tender to see its bidders and run
              compliance verification. Bidders are synthetic.
            </>
          )}
        </p>
      </div>

      {/* KPI row - every number computed from Prisma above */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<GridIcon />}
          value={tenders.length}
          label={isBidder ? 'Tenders you are registered on' : 'GeM tenders loaded'}
          href="/tenders"
        />
        {isBidder ? (
          <>
            <StatCard
              icon={<ShieldCheckIcon />}
              value={verifiedCount}
              label={`of ${tenders.length} verified by the officer`}
              badge={verifiedCount === tenders.length ? 'all done' : 'in progress'}
              badgeTone={verifiedCount === tenders.length ? 'green' : 'amber'}
              href="/bidders?filter=verified"
            />
            <StatCard
              icon={<FileIcon />}
              value={myDocs}
              label="Documents you have uploaded"
              href="/bidders"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={<UsersIcon />}
              value={totalBidders}
              label="Bidders across all tenders"
              href="/bidders"
            />
            <StatCard
              icon={<SparkIcon />}
              value={verifiedCount}
              label={`of ${totalBidders} AI-verified so far`}
              badge={dist.HIGH > 0 ? `${dist.HIGH} high-risk` : undefined}
              badgeTone="amber"
              href="/bidders?filter=verified"
            />
            <StatCard
              icon={<ShieldCheckIcon />}
              value={totalDecided}
              label={`of ${verifiedCount} officer adjudicated`}
              badge={awaitingOfficerReview > 0 ? `${awaitingOfficerReview} pending sign-off` : 'all signed'}
              badgeTone={awaitingOfficerReview > 0 ? 'amber' : 'green'}
              href="/bidders?filter=adjudication"
            />
          </>
        )}
      </div>

      {/* Dual Analytics Grid: AI Risk Distribution + Officer Adjudication Status */}
      {!isBidder && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card 1: AI Compliance Risk Distribution */}
          <div className="card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-line">
                <h3 className="section-title mb-0 flex items-center gap-2">
                  <SparkIcon className="h-4 w-4 text-saffron-800" />
                  AI Risk Distribution
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800 bg-saffron-50 px-2 py-0.5 rounded border border-saffron-200">
                  AI Screening Layer
                </span>
              </div>
              <p className="text-xs text-ink-muted mb-4">
                Automated risk tiering computed from registry checksums, vision OCR, and statutory rules.
              </p>
            </div>
            <RiskDonut low={dist.LOW} medium={dist.MEDIUM} high={dist.HIGH} />
            <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-ink-faint">
              <span>{verifiedCount} total bidders screened</span>
              <span className="font-mono text-critical font-medium">{dist.HIGH} flagged for disqualification</span>
            </div>
          </div>

          {/* Card 2: Officer Adjudication & Human Governance */}
          <OfficerAdjudicationCard
            totalScored={verifiedCount}
            qualified={officerQualified}
            conditional={officerConditional}
            disqualified={officerDisqualified}
            awaitingReview={awaitingOfficerReview}
            pendingBidders={pendingBiddersList}
          />
        </div>
      )}

      {/* Innovation Showcase: Deterministic-First Hybrid AI Architecture */}
      {!isBidder && <HybridAiArchitectureShowcase />}

      <TenderList tenders={rows} isBidder={isBidder} />
    </div>
  );
}
