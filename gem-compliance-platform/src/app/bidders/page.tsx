import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { BiddersDirectory, type BidderDirectoryItem } from '@/components/BiddersDirectory';
import { BriefcaseIcon, ShieldCheckIcon, UsersIcon } from '@/components/icons';
import { StatCard } from '@/components/StatCard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BiddersPage({
  searchParams,
}: {
  searchParams?: { filter?: string };
}) {
  const session = getSession();
  const isBidder = session?.role === 'bidder';
  const companySlug = isBidder ? session!.companySlug : undefined;

  // Fetch all bidders (or company-scoped for bidder role)
  const bidders = await prisma.bidder.findMany({
    where: isBidder ? { companySlug } : undefined,
    include: {
      tender: { select: { id: true, referenceNo: true, title: true } },
      documents: { select: { id: true } },
      scores: { orderBy: { computedAt: 'desc' }, take: 1 },
      decisions: { orderBy: { decidedAt: 'desc' }, take: 1 },
    },
    orderBy: { name: 'asc' },
  });

  const totalCount = bidders.length;
  let verifiedCount = 0;
  let highRiskCount = 0;
  let qualifiedCount = 0;

  const items: BidderDirectoryItem[] = bidders.map((b) => {
    const latestScore = b.scores[0];
    const latestDecision = b.decisions[0];

    if (latestScore) {
      verifiedCount++;
      if (latestScore.riskLevel === 'HIGH') highRiskCount++;
    }
    if (latestDecision?.outcome === 'QUALIFIED') qualifiedCount++;

    return {
      id: b.id,
      name: b.name,
      key: b.key,
      companySlug: b.companySlug,
      gstin: b.gstin,
      pan: b.pan,
      udyamNumber: b.udyamNumber,
      claimedTurnoverInrLakh: b.claimedTurnoverInrLakh,
      claimedEmployeeCount: b.claimedEmployeeCount,
      tenderId: b.tender.id,
      tenderRef: b.tender.referenceNo,
      tenderTitle: b.tender.title,
      docCount: b.documents.length,
      latestScore: latestScore ? Math.round(latestScore.complianceScore) : null,
      riskLevel: latestScore ? (latestScore.riskLevel as any) : null,
      decision: latestDecision ? (latestDecision.outcome as any) : null,
    };
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BriefcaseIcon className="h-6 w-6 text-navy" />
            <h1 className="font-heading text-2xl font-bold text-navy">
              {isBidder ? 'Company Participation Profile' : 'Bidders Directory'}
            </h1>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {isBidder
              ? `Compliance standing, tax identifiers, and statutory documentation across your registered bids.`
              : `Comprehensive registry of all participating bidders across 10 GeM tenders with real-time verification standing.`}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          icon={<UsersIcon />}
          value={totalCount}
          label="Total Bidders Registered"
          href="/bidders"
        />
        <StatCard
          icon={<ShieldCheckIcon />}
          value={verifiedCount}
          label="Verified by AI / Rules"
          badge={verifiedCount > 0 ? `${Math.round((verifiedCount / totalCount) * 100)}% done` : undefined}
          badgeTone="green"
          href="/bidders?filter=verified"
        />
        <StatCard
          icon={<BriefcaseIcon />}
          value={qualifiedCount}
          label="Formally Qualified by PO"
          href="/bidders?filter=qualified"
        />
        <StatCard
          icon={<ShieldCheckIcon />}
          value={highRiskCount}
          label="Flagged High Risk"
          badge={highRiskCount > 0 ? 'Requires attention' : undefined}
          badgeTone="amber"
          href="/bidders?filter=high-risk"
        />
      </div>

      {/* Interactive Directory Table */}
      <BiddersDirectory bidders={items} isBidder={isBidder} initialFilter={searchParams?.filter} />
    </div>
  );
}
