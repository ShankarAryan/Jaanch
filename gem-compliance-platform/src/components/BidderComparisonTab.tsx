'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ScaleIcon,
  ShieldCheckIcon,
  CheckIcon,
  DotIcon,
  DashIcon,
  SearchIcon,
  UsersIcon,
  BankIcon,
  SparkIcon,
  FileIcon,
  GridIcon,
} from '@/components/icons';
import { ScoreBadge } from '@/components/ScoreBadge';
import { RiskBadge } from '@/components/RiskBadge';
import { DocumentPreviewButton } from '@/components/DocumentPreviewButton';
import { VerifyButton } from '@/components/VerifyButton';

export interface CompetingBidderData {
  id: string;
  name: string;
  companySlug: string;
  udyamNumber: string | null;
  gstin: string | null;
  pan: string | null;
  claimedTurnoverInrLakh: number | null;
  claimedEmployeeCount: number | null;
  scores: Array<{
    complianceScore: number;
    riskLevel: string;
    breakdown: string;
    aiRecommendation?: string | null;
  }>;
  decisions: Array<{
    outcome: string;
    decidedAt: string | Date;
    remarks?: string | null;
    officerName?: string | null;
  }>;
  documents: Array<{
    id: string;
    docType: string;
    fileName: string;
    mimeType?: string | null;
  }>;
  verificationResults: Array<{
    requirementCode: string;
    status: string;
  }>;
}

export interface TenderSummaryInfo {
  id: string;
  referenceNo: string;
  title: string;
  category: string;
  organization: string;
}

export function BidderComparisonTab({
  currentBidderId,
  bidders,
  tender,
  canVerify,
  isBidder = false,
}: {
  currentBidderId: string;
  bidders: CompetingBidderData[];
  tender: TenderSummaryInfo;
  canVerify: boolean;
  isBidder?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'QUALIFIED'>('ALL');
  const [highlightDiff, setHighlightDiff] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const currentBidder = useMemo(
    () => bidders.find((b) => b.id === currentBidderId) || bidders[0],
    [bidders, currentBidderId],
  );

  // Parse evaluations map for each bidder (e.g. OEM, MII, GST, PAN, Udyam)
  const parsedBidders = useMemo(() => {
    return bidders.map((b) => {
      const latestScore = b.scores[0];
      const latestDecision = b.decisions[0];
      let evaluations: Array<{ code: string; label: string; outcome: string; reason?: string }> = [];
      try {
        if (latestScore?.breakdown) evaluations = JSON.parse(latestScore.breakdown);
      } catch {
        /* empty */
      }

      const evalMap = new Map(evaluations.map((e) => [e.code, e]));
      const vrMap = new Map(b.verificationResults.map((v) => [v.requirementCode, v.status]));

      const oemDoc = b.documents.find((d) => d.docType === 'OEM_AUTHORIZATION_CERTIFICATE');
      const miiDoc = b.documents.find((d) => d.docType === 'LOCAL_CONTENT_CERTIFICATE');

      return {
        ...b,
        latestScore,
        latestDecision,
        evalMap,
        vrMap,
        oemDoc,
        miiDoc,
        scoreVal: latestScore?.complianceScore ?? -1,
        riskVal: latestScore?.riskLevel ?? 'UNVERIFIED',
        isCurrent: b.id === currentBidderId,
      };
    });
  }, [bidders, currentBidderId]);

  // Sort by score descending, current bidder prominently identified
  const sortedBidders = useMemo(() => {
    return [...parsedBidders].sort((a, b) => {
      if (a.scoreVal !== b.scoreVal) return b.scoreVal - a.scoreVal;
      return a.name.localeCompare(b.name);
    });
  }, [parsedBidders]);

  // Filtered list based on search and filters
  const filteredBidders = useMemo(() => {
    return sortedBidders.filter((b) => {
      if (search) {
        const q = search.toLowerCase();
        const match =
          b.name.toLowerCase().includes(q) ||
          (b.pan && b.pan.toLowerCase().includes(q)) ||
          (b.gstin && b.gstin.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (riskFilter === 'QUALIFIED') return b.latestDecision?.outcome === 'QUALIFIED';
      if (riskFilter === 'LOW') return b.riskVal === 'LOW';
      if (riskFilter === 'MEDIUM') return b.riskVal === 'MEDIUM';
      if (riskFilter === 'HIGH') return b.riskVal === 'HIGH';
      return true;
    });
  }, [sortedBidders, search, riskFilter]);

  // Overall benchmark statistics
  const stats = useMemo(() => {
    const scored = parsedBidders.filter((b) => b.scoreVal >= 0);
    const avgScore = scored.length
      ? Math.round(scored.reduce((sum, b) => sum + b.scoreVal, 0) / scored.length)
      : null;
    const topScore = scored.length ? Math.max(...scored.map((b) => b.scoreVal)) : null;
    const lowRiskCount = parsedBidders.filter((b) => b.riskVal === 'LOW').length;
    const highRiskCount = parsedBidders.filter((b) => b.riskVal === 'HIGH').length;
    const qualifiedCount = parsedBidders.filter((b) => b.latestDecision?.outcome === 'QUALIFIED').length;

    const currentRank = sortedBidders.findIndex((b) => b.id === currentBidderId) + 1;

    return {
      total: bidders.length,
      scoredCount: scored.length,
      avgScore,
      topScore,
      lowRiskCount,
      highRiskCount,
      qualifiedCount,
      currentRank: currentRank > 0 ? currentRank : 1,
    };
  }, [bidders.length, parsedBidders, sortedBidders, currentBidderId]);

  const currentScoreVal = currentBidder?.scores[0]?.complianceScore ?? null;

  return (
    <div className="space-y-6">
      {/* Top Banner & Context */}
      <div className="rounded-xl border border-line bg-gradient-to-r from-surface-lowest via-surface-low to-surface-lowest p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-saffron/10 px-2.5 py-0.5 text-xs font-semibold text-saffron-800">
                <ScaleIcon className="h-3.5 w-3.5" />
                Tender Competitor Matrix
              </span>
              <span className="mono-chip">{tender.referenceNo}</span>
            </div>
            <h2 className="mt-1.5 font-heading text-lg font-bold text-navy">
              Comparative Analysis: {currentBidder?.name ?? 'Selected Bidder'} vs. Remaining Bidders
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Side-by-side technical, financial, and statutory evaluation across all {stats.total} registered bidders on{' '}
              <span className="font-medium text-navy">{tender.title}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-line/80 bg-surface px-3 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-ink-faint block">Current Standing</span>
              <span className="font-heading text-sm font-bold text-navy">
                Rank #{stats.currentRank} <span className="text-xs font-normal text-ink-muted">of {stats.total}</span>
              </span>
            </div>
            <div className="rounded-lg border border-line/80 bg-surface px-3 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-ink-faint block">Your Score</span>
              <span className="font-heading text-sm font-bold text-navy">
                {currentScoreVal != null ? `${currentScoreVal}/100` : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* 4 KPI Benchmark Metric Cards */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-line/60">
          <div className="rounded-lg border border-line bg-surface p-3">
            <span className="text-[10px] uppercase font-semibold text-ink-faint block">Highest Score</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-heading text-base font-bold text-indiagreen-700">
                {stats.topScore != null ? `${stats.topScore}%` : '—'}
              </span>
              <span className="text-[11px] text-ink-muted">top contender</span>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-surface p-3">
            <span className="text-[10px] uppercase font-semibold text-ink-faint block">Average Compliance</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-heading text-base font-bold text-navy">
                {stats.avgScore != null ? `${stats.avgScore}%` : '—'}
              </span>
              <span className="text-[11px] text-ink-muted">tender mean</span>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-surface p-3">
            <span className="text-[10px] uppercase font-semibold text-ink-faint block">Risk Distribution</span>
            <div className="mt-1 flex items-center gap-2 text-xs font-medium">
              <span className="text-indiagreen-700">{stats.lowRiskCount} Low</span>
              <span className="text-ink-faint">·</span>
              <span className="text-risk-high">{stats.highRiskCount} High</span>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-surface p-3">
            <span className="text-[10px] uppercase font-semibold text-ink-faint block">Officer Decisions</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-heading text-base font-bold text-navy">{stats.qualifiedCount}</span>
              <span className="text-[11px] text-ink-muted">of {stats.total} Qualified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3.5">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-ink-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter bidders by name, PAN, or GSTIN…"
              className="w-full rounded-md border border-line bg-surface pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-navy focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Risk filter pills */}
          <div className="flex items-center gap-1 rounded-md border border-line bg-surface p-1 text-xs">
            {(['ALL', 'LOW', 'MEDIUM', 'HIGH', 'QUALIFIED'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRiskFilter(r)}
                className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  riskFilter === r ? 'bg-navy text-white shadow-xs' : 'text-ink-muted hover:text-navy'
                }`}
              >
                {r === 'ALL' ? 'All' : r === 'QUALIFIED' ? 'Qualified' : `${r} Risk`}
              </button>
            ))}
          </div>

          {/* Highlight differences toggle */}
          <button
            type="button"
            onClick={() => setHighlightDiff((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              highlightDiff
                ? 'border-saffron bg-saffron/10 text-saffron-800'
                : 'border-line text-ink-muted hover:bg-surface hover:text-navy'
            }`}
            title="Spotlight differences between competitors and the current active bidder"
          >
            <SparkIcon className="h-3.5 w-3.5" />
            <span>Spotlight Diff</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-md border border-line bg-surface p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                viewMode === 'table' ? 'bg-surface-highest text-navy font-semibold' : 'text-ink-muted'
              }`}
            >
              Matrix
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                viewMode === 'cards' ? 'bg-surface-highest text-navy font-semibold' : 'text-ink-muted'
              }`}
            >
              Cards
            </button>
          </div>
        </div>
      </div>

      {/* MATRIX TABLE VIEW */}
      {viewMode === 'table' ? (
        <div className="card overflow-hidden p-0 border border-line shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-line bg-surface-low text-label uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Bidder</th>
                  <th className="px-3 py-3 font-semibold text-center">Score</th>
                  <th className="px-3 py-3 font-semibold text-center">Risk</th>
                  <th className="px-3 py-3 font-semibold">PAN / GST</th>
                  <th className="px-3 py-3 font-semibold">MSME / Udyam</th>
                  <th className="px-3 py-3 font-semibold">OEM Auth</th>
                  <th className="px-3 py-3 font-semibold">Make in India</th>
                  <th className="px-3 py-3 font-semibold">Turnover</th>
                  <th className="px-3 py-3 font-semibold">Docs</th>
                  <th className="px-3 py-3 font-semibold">PO Decision</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredBidders.map((b, idx) => {
                  const panEval = b.evalMap.get('PAN_IT_COMPLIANCE');
                  const gstEval = b.evalMap.get('GST_FILING');
                  const udyamEval = b.evalMap.get('UDYAM_STATUS');
                  const oemEval = b.evalMap.get('OEM_AUTHORIZATION');
                  const miiEval = b.evalMap.get('MAKE_IN_INDIA_LOCAL_CONTENT');

                  const isBetter = currentScoreVal != null && b.scoreVal > currentScoreVal;
                  const isWorse = currentScoreVal != null && b.scoreVal >= 0 && b.scoreVal < currentScoreVal;

                  const diffRowClass = highlightDiff
                    ? b.isCurrent
                      ? 'bg-saffron/5 ring-1 ring-inset ring-saffron/30'
                      : isBetter
                      ? 'bg-indiagreen/5'
                      : isWorse
                      ? 'bg-amber-500/5'
                      : ''
                    : b.isCurrent
                    ? 'bg-surface-low/80 font-medium'
                    : 'hover:bg-surface-lowest';

                  return (
                    <tr key={b.id} className={`transition-colors ${diffRowClass}`}>
                      {/* Bidder name and status */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-ink-faint w-4">#{idx + 1}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/bidders/${b.id}`}
                                className={`font-semibold transition-colors hover:underline ${
                                  b.isCurrent ? 'text-saffron-800' : 'text-navy hover:text-saffron-800'
                                }`}
                              >
                                {b.name}
                              </Link>
                              {b.isCurrent && (
                                <span className="rounded bg-saffron px-1.5 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider">
                                  Current
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-ink-faint">{b.companySlug}</span>
                          </div>
                        </div>
                      </td>

                      {/* Compliance Score */}
                      <td className="px-3 py-3.5 text-center">
                        <ScoreBadge score={b.scoreVal >= 0 ? b.scoreVal : null} />
                      </td>

                      {/* Risk Tier */}
                      <td className="px-3 py-3.5 text-center">
                        <RiskBadge level={b.riskVal !== 'UNVERIFIED' ? b.riskVal : null} />
                      </td>

                      {/* PAN / GST */}
                      <td className="px-3 py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-ink-faint">PAN:</span>
                            {panEval ? (
                              <span
                                className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
                                  panEval.outcome === 'MET' ? 'text-indiagreen-700' : 'text-risk-high'
                                }`}
                              >
                                {panEval.outcome === 'MET' ? <CheckIcon className="h-2.5 w-2.5" /> : '✗'}
                                {panEval.outcome === 'MET' ? 'Valid' : 'Failed'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-ink-faint">—</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-ink-faint">GST:</span>
                            {gstEval ? (
                              <span
                                className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
                                  gstEval.outcome === 'MET' ? 'text-indiagreen-700' : 'text-amber-600'
                                }`}
                              >
                                {gstEval.outcome === 'MET' ? <CheckIcon className="h-2.5 w-2.5" /> : '⚠'}
                                {gstEval.outcome === 'MET' ? 'Clean' : 'Delayed'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-ink-faint">—</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* MSME / Udyam */}
                      <td className="px-3 py-3.5">
                        {udyamEval ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              udyamEval.outcome === 'MET'
                                ? 'bg-indiagreen/10 text-indiagreen-700'
                                : 'bg-surface-high text-ink-faint'
                            }`}
                          >
                            {udyamEval.outcome === 'MET' ? 'MSE Verified' : 'Non-MSE'}
                          </span>
                        ) : (
                          <span className="text-ink-faint text-[10px]">Declared only</span>
                        )}
                      </td>

                      {/* OEM Auth */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {oemEval ? (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                oemEval.outcome === 'MET'
                                  ? 'bg-indiagreen/10 text-indiagreen-700'
                                  : oemEval.outcome === 'NOT_APPLICABLE'
                                  ? 'bg-surface-high text-ink-muted'
                                  : 'bg-risk-high/10 text-risk-high'
                              }`}
                            >
                              {oemEval.outcome === 'MET'
                                ? 'Verified'
                                : oemEval.outcome === 'NOT_APPLICABLE'
                                ? 'N/A'
                                : 'Mismatched'}
                            </span>
                          ) : (
                            <span className="text-ink-faint text-[10px]">—</span>
                          )}
                          {b.oemDoc && (
                            <DocumentPreviewButton
                              documentId={b.oemDoc.id}
                              fileName={b.oemDoc.fileName}
                              mimeType={b.oemDoc.mimeType || 'application/pdf'}
                            />
                          )}
                        </div>
                      </td>

                      {/* Make in India */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {miiEval ? (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                miiEval.outcome === 'MET'
                                  ? 'bg-indiagreen/10 text-indiagreen-700'
                                  : miiEval.outcome === 'NOT_APPLICABLE'
                                  ? 'bg-surface-high text-ink-muted'
                                  : 'bg-amber-500/10 text-amber-700'
                              }`}
                            >
                              {miiEval.outcome === 'MET'
                                ? 'Class I'
                                : miiEval.outcome === 'NOT_APPLICABLE'
                                ? 'Waived'
                                : 'Non-Class I'}
                            </span>
                          ) : (
                            <span className="text-ink-faint text-[10px]">—</span>
                          )}
                          {b.miiDoc && (
                            <DocumentPreviewButton
                              documentId={b.miiDoc.id}
                              fileName={b.miiDoc.fileName}
                              mimeType={b.miiDoc.mimeType || 'application/pdf'}
                            />
                          )}
                        </div>
                      </td>

                      {/* Turnover */}
                      <td className="px-3 py-3.5 font-mono text-ink">
                        {b.claimedTurnoverInrLakh != null ? `₹${b.claimedTurnoverInrLakh} L` : '—'}
                      </td>

                      {/* Documents Count */}
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                          <FileIcon className="h-2.5 w-2.5" />
                          {b.documents.length}
                        </span>
                      </td>

                      {/* Decision */}
                      <td className="px-3 py-3.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            b.latestDecision?.outcome === 'QUALIFIED'
                              ? 'bg-indiagreen/15 text-indiagreen-700'
                              : b.latestDecision?.outcome === 'DISQUALIFIED'
                              ? 'bg-risk-high/15 text-risk-high'
                              : 'bg-surface-high text-ink-faint'
                          }`}
                        >
                          {b.latestDecision ? b.latestDecision.outcome : 'Pending'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {canVerify && !isBidder && (
                            <VerifyButton
                              bidderId={b.id}
                              bidderName={b.name}
                              label={b.latestScore ? 'Re-verify' : 'Verify'}
                              compact
                            />
                          )}
                          <Link
                            href={`/bidders/${b.id}`}
                            className={`text-xs font-semibold hover:underline ${
                              b.isCurrent ? 'text-saffron-800' : 'text-navy'
                            }`}
                          >
                            {b.isCurrent ? 'Active Dossier' : 'Open Dossier →'}
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
      ) : (
        /* CARD / GRID VIEW */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBidders.map((b, idx) => {
            const oemEval = b.evalMap.get('OEM_AUTHORIZATION');
            const miiEval = b.evalMap.get('MAKE_IN_INDIA_LOCAL_CONTENT');

            return (
              <div
                key={b.id}
                className={`card bidder-card flex flex-col justify-between border transition-all ${
                  b.isCurrent
                    ? 'border-saffron bg-gradient-to-b from-saffron/5 to-surface shadow-md ring-1 ring-saffron/30'
                    : 'border-line hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-ink-faint">#{idx + 1}</span>
                        <h4 className="font-heading text-sm font-bold text-navy leading-tight">{b.name}</h4>
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-ink-faint">{b.companySlug}</p>
                    </div>
                    {b.isCurrent && (
                      <span className="rounded bg-saffron px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider shrink-0">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5">
                    <ScoreBadge score={b.scoreVal >= 0 ? b.scoreVal : null} />
                    <RiskBadge level={b.riskVal !== 'UNVERIFIED' ? b.riskVal : null} />
                  </div>

                  <dl className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between border-b border-line/40 pb-1">
                      <dt className="text-ink-faint">Claimed Turnover</dt>
                      <dd className="font-mono font-medium text-ink">
                        {b.claimedTurnoverInrLakh != null ? `₹${b.claimedTurnoverInrLakh} Lakh` : '—'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between border-b border-line/40 pb-1">
                      <dt className="text-ink-faint">OEM Certificate</dt>
                      <dd className="font-medium text-ink">
                        {oemEval ? (
                          <span
                            className={
                              oemEval.outcome === 'MET'
                                ? 'text-indiagreen-700 font-semibold'
                                : 'text-risk-high font-semibold'
                            }
                          >
                            {oemEval.outcome === 'MET' ? '✓ Verified' : '✗ Mismatched'}
                          </span>
                        ) : (
                          '—'
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between border-b border-line/40 pb-1">
                      <dt className="text-ink-faint">Make in India</dt>
                      <dd className="font-medium text-ink">
                        {miiEval ? (
                          <span
                            className={
                              miiEval.outcome === 'MET'
                                ? 'text-indiagreen-700 font-semibold'
                                : 'text-amber-600 font-semibold'
                            }
                          >
                            {miiEval.outcome === 'MET' ? 'Class I (≥50%)' : 'Class II (<50%)'}
                          </span>
                        ) : (
                          '—'
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      b.latestDecision?.outcome === 'QUALIFIED'
                        ? 'bg-indiagreen/15 text-indiagreen-700'
                        : b.latestDecision?.outcome === 'DISQUALIFIED'
                        ? 'bg-risk-high/15 text-risk-high'
                        : 'bg-surface-high text-ink-muted'
                    }`}
                  >
                    {b.latestDecision ? b.latestDecision.outcome : 'Pending Decision'}
                  </span>

                  <Link
                    href={`/bidders/${b.id}`}
                    className={`text-xs font-semibold hover:underline ${
                      b.isCurrent ? 'text-saffron-800' : 'text-navy'
                    }`}
                  >
                    {b.isCurrent ? 'View Dossier' : 'Examine Bidder →'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
