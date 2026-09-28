import { prisma } from '@/lib/db';
import { BarChartIcon, ShieldCheckIcon, UsersIcon, LayersIcon } from '@/components/icons';
import { StatCard } from '@/components/StatCard';
import { RiskDonut } from '@/components/RiskDonut';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const [tenders, bidders, decisions] = await Promise.all([
    prisma.tender.findMany({
      include: {
        _count: { select: { bidders: true, requirements: true } },
      },
    }),
    prisma.bidder.findMany({
      include: {
        scores: { orderBy: { computedAt: 'desc' }, take: 1 },
        decisions: { orderBy: { decidedAt: 'desc' }, take: 1 },
      },
    }),
    prisma.decision.findMany(),
  ]);

  const totalBidders = bidders.length;
  const verifiedBidders = bidders.filter((b) => b.scores.length > 0);
  const verifiedCount = verifiedBidders.length;

  const riskDist = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  let totalScoreSum = 0;
  for (const b of verifiedBidders) {
    const s = b.scores[0];
    if (s) {
      if (s.riskLevel in riskDist) (riskDist as any)[s.riskLevel]++;
      totalScoreSum += s.complianceScore;
    }
  }
  const avgScore = verifiedCount > 0 ? Math.round(totalScoreSum / verifiedCount) : 0;

  const qualifiedCount = decisions.filter((d) => d.outcome === 'QUALIFIED').length;
  const disqualifiedCount = decisions.filter((d) => d.outcome === 'DISQUALIFIED').length;

  // Ministry breakdown
  const orgMap = new Map<string, { tenderCount: number; bidderCount: number }>();
  for (const t of tenders) {
    const org = t.organization.split(',')[0].trim();
    const existing = orgMap.get(org) || { tenderCount: 0, bidderCount: 0 };
    existing.tenderCount++;
    existing.bidderCount += t._count.bidders;
    orgMap.set(org, existing);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <BarChartIcon className="h-6 w-6 text-navy" />
          <h1 className="font-heading text-2xl font-bold text-navy">Procurement Compliance Analytics</h1>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Statistical overview of tender volume, bidder participation, automated verification outcomes, and risk classification.
        </p>
      </div>

      {/* Top Level KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={<LayersIcon />} value={tenders.length} label="Published GeM Tenders" />
        <StatCard icon={<UsersIcon />} value={totalBidders} label="Participating Bidders" />
        <StatCard
          icon={<ShieldCheckIcon />}
          value={`${verifiedCount} / ${totalBidders}`}
          label="Verification Progress"
          badge={totalBidders > 0 ? `${Math.round((verifiedCount / totalBidders) * 100)}% verified` : undefined}
          badgeTone="green"
        />
        <StatCard
          icon={<BarChartIcon />}
          value={`${avgScore}/100`}
          label="Mean Compliance Score"
          badge={avgScore >= 75 ? 'Healthy compliance' : 'Review suggested'}
          badgeTone={avgScore >= 75 ? 'green' : 'amber'}
        />
      </div>

      {/* Visual Breakdowns */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Risk Classification Donut Card */}
        <div className="card space-y-4">
          <h3 className="section-title">Risk Profile Breakdown</h3>
          <p className="text-xs text-ink-muted">
            Automated categorisation derived from statutory gates (GST, PAN, debarment, OEM letters).
          </p>
          <div className="pt-2">
            <RiskDonut low={riskDist.LOW} medium={riskDist.MEDIUM} high={riskDist.HIGH} />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-line text-center">
            <div className="rounded bg-indiagreen/10 p-2">
              <span className="text-[10px] uppercase font-semibold text-indiagreen-700 block">Low Risk</span>
              <span className="text-lg font-bold text-indiagreen-700">{riskDist.LOW}</span>
            </div>
            <div className="rounded bg-warning/10 p-2">
              <span className="text-[10px] uppercase font-semibold text-warning-fg block">Medium Risk</span>
              <span className="text-lg font-bold text-warning-fg">{riskDist.MEDIUM}</span>
            </div>
            <div className="rounded bg-critical/10 p-2">
              <span className="text-[10px] uppercase font-semibold text-critical-fg block">High Risk</span>
              <span className="text-lg font-bold text-critical-fg">{riskDist.HIGH}</span>
            </div>
          </div>
        </div>

        {/* PO Decision Outcome Card */}
        <div className="card space-y-4">
          <h3 className="section-title">Officer Qualification Decisions</h3>
          <p className="text-xs text-ink-muted">
            Formal decisions recorded by Procurement Officers with legal responsibility.
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-indiagreen-700">Formally Qualified</span>
                <span>{qualifiedCount} bidders</span>
              </div>
              <div className="h-2.5 w-full bg-surface-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-indiagreen"
                  style={{ width: `${totalBidders > 0 ? (qualifiedCount / totalBidders) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-critical-fg">Disqualified</span>
                <span>{disqualifiedCount} bidders</span>
              </div>
              <div className="h-2.5 w-full bg-surface-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-critical"
                  style={{ width: `${totalBidders > 0 ? (disqualifiedCount / totalBidders) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-ink-muted">Pending Final Decision</span>
                <span>{totalBidders - (qualifiedCount + disqualifiedCount)} bidders</span>
              </div>
              <div className="h-2.5 w-full bg-surface-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-saffron"
                  style={{
                    width: `${
                      totalBidders > 0
                        ? ((totalBidders - (qualifiedCount + disqualifiedCount)) / totalBidders) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded border border-line/60 bg-surface-low/50 p-3 text-xs text-ink-muted mt-4">
            <strong className="text-navy font-semibold block mb-0.5">Procurement Integrity Safeguard:</strong>
            AI provides recommendations and risk tiers, but never unilaterally awards or cancels a bid. Final decisions require signed officer authentication.
          </div>
        </div>
      </div>

      {/* Ministry & Organisation Breakdown Table */}
      <div className="card space-y-3">
        <h3 className="section-title">Volume by Procuring Authority</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface-low/40 text-[11px] font-semibold uppercase text-ink-muted">
              <tr>
                <th className="py-2.5 px-3">Procuring Entity</th>
                <th className="py-2.5 px-3 text-center">Tenders</th>
                <th className="py-2.5 px-3 text-center">Bidders</th>
                <th className="py-2.5 px-3 text-right">Avg Bidders per Tender</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {Array.from(orgMap.entries()).map(([org, stat]) => (
                <tr key={org} className="hover:bg-surface-low/30">
                  <td className="py-2.5 px-3 font-medium text-ink">{org}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{stat.tenderCount}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-semibold text-navy">{stat.bidderCount}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-ink-muted">
                    {(stat.bidderCount / stat.tenderCount).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
