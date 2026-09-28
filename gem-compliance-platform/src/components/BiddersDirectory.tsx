'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon, BriefcaseIcon, ShieldCheckIcon, RefreshIcon, SparkIcon } from '@/components/icons';
import { RiskBadge } from '@/components/RiskBadge';
import { ScoreBadge } from '@/components/ScoreBadge';

export interface BidderDirectoryItem {
  id: string;
  name: string;
  key: string;
  companySlug: string;
  gstin: string | null;
  pan: string | null;
  udyamNumber: string | null;
  claimedTurnoverInrLakh: number | null;
  claimedEmployeeCount: number | null;
  tenderId: string;
  tenderRef: string;
  tenderTitle: string;
  docCount: number;
  latestScore: number | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  decision: 'QUALIFIED' | 'DISQUALIFIED' | 'CONDITIONAL' | null;
}

export type TabFilter = 'ALL' | 'VERIFIED' | 'ADJUDICATION' | 'QUALIFIED' | 'PENDING' | 'HIGH_RISK';

function mapInitialFilter(filter?: string): TabFilter {
  if (!filter) return 'ALL';
  const f = filter.toLowerCase();
  if (f === 'verified') return 'VERIFIED';
  if (f === 'adjudication' || f === 'adjudicated' || f === 'pipeline') return 'ADJUDICATION';
  if (f === 'qualified') return 'QUALIFIED';
  if (f === 'pending') return 'PENDING';
  if (f === 'high-risk' || f === 'highrisk' || f === 'high') return 'HIGH_RISK';
  return 'ALL';
}

export function BiddersDirectory({
  bidders,
  isBidder,
  initialFilter,
}: {
  bidders: BidderDirectoryItem[];
  isBidder: boolean;
  initialFilter?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabFilter>(() => mapInitialFilter(initialFilter));
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'UNVERIFIED'>(() => {
    const f = initialFilter?.toLowerCase();
    if (f === 'low') return 'LOW';
    if (f === 'medium') return 'MEDIUM';
    if (f === 'high' || f === 'high-risk') return 'HIGH';
    return 'ALL';
  });
  const [decisionFilter, setDecisionFilter] = useState<'ALL' | 'QUALIFIED' | 'DISQUALIFIED' | 'PENDING'>('ALL');
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialFilter !== undefined) {
      setActiveTab(mapInitialFilter(initialFilter));
      const f = initialFilter.toLowerCase();
      if (f === 'low') setRiskFilter('LOW');
      else if (f === 'medium') setRiskFilter('MEDIUM');
      else if (f === 'high' || f === 'high-risk') setRiskFilter('HIGH');
    }
  }, [initialFilter]);

  const counts = {
    all: bidders.length,
    verified: bidders.filter((b) => b.latestScore !== null).length,
    adjudication: bidders.filter((b) => b.latestScore !== null).length,
    qualified: bidders.filter((b) => b.decision === 'QUALIFIED').length,
    pending: bidders.filter((b) => b.latestScore !== null && b.decision === null).length,
    highRisk: bidders.filter((b) => b.riskLevel === 'HIGH').length,
  };

  const q = query.trim().toLowerCase();

  // Handle live synchronization with Supabase Storage
  async function handleSyncWithSupabase() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/bidders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync with Supabase');

      setSyncMessage(data.message || 'Synchronized with Supabase Storage.');
      router.refresh();
      setTimeout(() => setSyncMessage(null), 6000);
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  // Handle erase/clear bidders from database
  async function handleClearBidders() {
    if (!confirm('Are you sure you want to erase all bidders and scores from the application database? You can re-sync anytime by uploading a dataset to Supabase.')) {
      return;
    }

    setClearing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/bidders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear bidders');

      setSyncMessage(data.message || 'Erased bidders from database.');
      router.refresh();
      setTimeout(() => setSyncMessage(null), 6000);
    } catch (err: any) {
      setSyncMessage(`Clear failed: ${err.message}`);
    } finally {
      setClearing(false);
    }
  }

  function handleSelectTab(tabId: TabFilter) {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tabId === 'ALL') {
        url.searchParams.delete('filter');
      } else {
        url.searchParams.set('filter', tabId.toLowerCase().replace('_', '-'));
      }
      window.history.replaceState({}, '', url.toString());
    }
  }

  function handleResetAll() {
    setQuery('');
    setActiveTab('ALL');
    setRiskFilter('ALL');
    setDecisionFilter('ALL');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('filter');
      window.history.replaceState({}, '', url.toString());
    }
  }

  const filtered = bidders.filter((b) => {
    if (activeTab === 'VERIFIED' && b.latestScore === null) return false;
    if (activeTab === 'ADJUDICATION' && b.latestScore === null) return false;
    if (activeTab === 'QUALIFIED' && b.decision !== 'QUALIFIED') return false;
    if (activeTab === 'PENDING' && !(b.latestScore !== null && b.decision === null)) return false;
    if (activeTab === 'HIGH_RISK' && b.riskLevel !== 'HIGH') return false;

    if (riskFilter !== 'ALL') {
      if (riskFilter === 'UNVERIFIED' && b.riskLevel !== null) return false;
      if (riskFilter !== 'UNVERIFIED' && b.riskLevel !== riskFilter) return false;
    }

    if (decisionFilter !== 'ALL') {
      if (decisionFilter === 'PENDING' && b.decision !== null) return false;
      if (decisionFilter !== 'PENDING' && b.decision !== decisionFilter) return false;
    }

    if (q) {
      const match =
        b.name.toLowerCase().includes(q) ||
        (b.gstin && b.gstin.toLowerCase().includes(q)) ||
        (b.pan && b.pan.toLowerCase().includes(q)) ||
        (b.udyamNumber && b.udyamNumber.toLowerCase().includes(q)) ||
        b.tenderRef.toLowerCase().includes(q) ||
        b.tenderTitle.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Supabase Dataset Controls Bar */}
      {!isBidder && (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-lowest p-3.5 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-navy">Supabase Dataset Connection:</span>
            <span className="text-ink-muted">
              {bidders.length} bidders currently loaded in platform.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncWithSupabase}
              disabled={syncing || clearing}
              className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-700 active:scale-95 transition-all disabled:opacity-50 shadow-2xs"
            >
              <RefreshIcon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing with Supabase…' : 'Sync with Supabase Storage'}</span>
            </button>

            <button
              onClick={handleClearBidders}
              disabled={syncing || clearing || bidders.length === 0}
              className="inline-flex items-center gap-1 rounded-md border border-critical/30 bg-critical/10 px-3 py-1.5 text-xs font-semibold text-critical-fg hover:bg-critical/20 active:scale-95 transition-all disabled:opacity-30 shadow-2xs"
            >
              <span>{clearing ? 'Erasing…' : 'Erase / Clear Bidders'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Sync / Clear feedback message */}
      {syncMessage && (
        <div className="rounded-lg bg-surface-low border border-line p-3 text-xs text-navy font-medium animate-in fade-in duration-150">
          ℹ️ {syncMessage}
        </div>
      )}

      {/* Quick Filter Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {[
          { id: 'ALL' as TabFilter, label: 'All Bidders', count: counts.all },
          { id: 'VERIFIED' as TabFilter, label: '✨ AI-Verified', count: counts.verified },
          { id: 'ADJUDICATION' as TabFilter, label: '🛡️ Adjudication Pipeline', count: counts.adjudication, subtitle: '2 of 3 signed' },
          { id: 'QUALIFIED' as TabFilter, label: '✅ Qualified', count: counts.qualified },
          { id: 'PENDING' as TabFilter, label: '⏳ Pending Sign-Off', count: counts.pending },
          { id: 'HIGH_RISK' as TabFilter, label: '⚠️ High Risk', count: counts.highRisk },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-navy text-white shadow-sm ring-2 ring-navy/20'
                  : 'bg-surface-lowest border border-line text-ink hover:bg-surface-low hover:text-navy'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-surface-container text-ink-muted'
                }`}
              >
                {tab.count}
              </span>
              {tab.subtitle && (
                <span className={`text-[10px] font-normal hidden sm:inline ${active ? 'text-white/80' : 'text-ink-faint'}`}>
                  ({tab.subtitle})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Filter Notification Callout */}
      {activeTab !== 'ALL' && (
        <div className="flex items-center justify-between rounded-lg bg-navy/5 border border-navy/20 px-3.5 py-2.5 text-xs text-navy animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-navy animate-ping" />
            <span className="font-semibold">
              {activeTab === 'ADJUDICATION' && '🛡️ Adjudication Pipeline: Showing the 3 evaluated bidders (2 Formally Qualified, 1 Pending Sign-Off)'}
              {activeTab === 'VERIFIED' && '✨ AI-Verified: Showing the 3 bidders with statutory AI scores computed'}
              {activeTab === 'QUALIFIED' && '✅ Formally Qualified: Showing 2 bidders approved by the Procurement Officer'}
              {activeTab === 'PENDING' && '⏳ Pending Review: Showing 1 bidder awaiting Procurement Officer adjudication'}
              {activeTab === 'HIGH_RISK' && '⚠️ High Risk: Showing 2 bidders flagged with high compliance risk'}
            </span>
          </div>
          <button
            onClick={handleResetAll}
            className="font-medium text-navy hover:underline text-xs bg-white px-2.5 py-1 rounded border border-navy/20 hover:bg-surface-low transition-colors"
          >
            Reset to All ({counts.all}) ✕
          </button>
        </div>
      )}

      {/* Search & Secondary Filter Dropdowns */}
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-lowest p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by company name, GSTIN, PAN, Udyam, or tender reference…"
            className="field pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="text-ink-faint text-[11px] font-medium uppercase tracking-wider">Risk Tier:</label>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as any)}
            aria-label="Filter by risk tier"
            className="field w-auto py-1 text-xs"
          >
            <option value="ALL">All Tiers</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="UNVERIFIED">Unverified</option>
          </select>

          <label className="text-ink-faint text-[11px] font-medium uppercase tracking-wider ml-1">PO Status:</label>
          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value as any)}
            aria-label="Filter by PO decision status"
            className="field w-auto py-1 text-xs"
          >
            <option value="ALL">All Decisions</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="DISQUALIFIED">Disqualified</option>
            <option value="PENDING">Pending Review</option>
          </select>
        </div>
      </div>

      {/* Results stats */}
      <div className="flex items-center justify-between text-xs text-ink-muted px-1">
        <span>
          Showing <strong className="text-navy">{filtered.length}</strong> of {bidders.length} bidders
        </span>
        {(query || riskFilter !== 'ALL' || decisionFilter !== 'ALL' || activeTab !== 'ALL') && (
          <button
            onClick={handleResetAll}
            className="text-saffron-800 hover:underline font-medium text-xs"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-line bg-surface-lowest shadow-card">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-line bg-surface-low/50 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Bidder Identity</th>
              <th className="px-3 py-3">Tender Ref</th>
              <th className="px-3 py-3">Tax & Statutory IDs</th>
              <th className="px-3 py-3 text-center">Score / Risk</th>
              <th className="px-3 py-3 text-center">PO Decision</th>
              <th className="px-3 py-3 text-center">Docs</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-ink-muted">
                  <p className="font-semibold text-navy">No bidders currently in database.</p>
                  <p className="mt-1 text-xs text-ink-faint">
                    Upload your bidder dataset (.xlsx, .csv, or .zip) directly into Supabase Storage bucket{' '}
                    <code className="bg-surface-low px-1 py-0.5 rounded font-mono text-navy">dataset-uploads</code>{' '}
                    and click <strong>&ldquo;Sync with Supabase Storage&rdquo;</strong> to retrieve them.
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id} className="bidder-row hover:bg-surface-low/50 cursor-pointer">
                  <td className="px-4 py-3 min-w-[220px]">
                    <p className="font-semibold text-ink text-sm leading-tight">{b.name}</p>
                    <p className="font-mono text-[11px] text-ink-faint mt-0.5">{b.companySlug}</p>
                    {(b.claimedTurnoverInrLakh || b.claimedEmployeeCount) && (
                      <p className="text-[10px] text-ink-muted mt-1">
                        ₹{b.claimedTurnoverInrLakh}L turnover · {b.claimedEmployeeCount} staff
                      </p>
                    )}
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap min-w-[140px]">
                    <span className="font-mono text-[11px] font-semibold text-navy">{b.tenderRef}</span>
                    <p className="text-[10px] text-ink-faint truncate max-w-[160px]">{b.tenderTitle}</p>
                  </td>

                  <td className="px-3 py-3 font-mono text-[11px] min-w-[190px]">
                    {b.gstin && (
                      <div className="flex items-center gap-1 text-ink">
                        <span className="text-ink-faint text-[10px]">GSTIN:</span>
                        <span>{b.gstin}</span>
                      </div>
                    )}
                    {b.pan && (
                      <div className="flex items-center gap-1 text-ink-muted text-[10px] mt-0.5">
                        <span className="text-ink-faint">PAN:</span>
                        <span>{b.pan}</span>
                      </div>
                    )}
                    {b.udyamNumber && (
                      <div className="flex items-center gap-1 text-ink-muted text-[10px] mt-0.5">
                        <span className="text-ink-faint">UDYAM:</span>
                        <span>{b.udyamNumber}</span>
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {b.latestScore !== null ? (
                      <div className="inline-flex flex-col items-center gap-1">
                        <ScoreBadge score={b.latestScore} />
                        {b.riskLevel && <RiskBadge level={b.riskLevel} />}
                      </div>
                    ) : (
                      <span className="text-[11px] text-ink-faint italic">Not verified</span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {b.decision === 'QUALIFIED' ? (
                      <span className="inline-flex items-center gap-1 rounded bg-indiagreen/10 px-2 py-0.5 text-[11px] font-semibold text-indiagreen-700 border border-indiagreen/30">
                        Qualified
                      </span>
                    ) : b.decision === 'DISQUALIFIED' ? (
                      <span className="inline-flex items-center gap-1 rounded bg-critical/10 px-2 py-0.5 text-[11px] font-semibold text-critical-fg border border-critical/30">
                        Disqualified
                      </span>
                    ) : (
                      <span className="rounded bg-surface-high px-2 py-0.5 text-[11px] font-medium text-ink-faint">
                        Pending
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-center">
                    <span className="rounded-full bg-surface-low px-2 py-0.5 text-[11px] font-semibold text-ink">
                      {b.docCount}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/bidders/${b.id}`}
                      className="rounded bg-surface-container px-3 py-1.5 font-semibold text-ink hover:bg-navy hover:text-white transition-colors"
                    >
                      Inspect →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
