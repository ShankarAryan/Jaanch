'use client';

import { useState } from 'react';
import { LayersIcon, ScaleIcon } from '@/components/icons';
import { BidderComparisonTab, type CompetingBidderData, type TenderSummaryInfo } from './BidderComparisonTab';

export function TenderDetailViewTabs({
  bidders,
  tender,
  canVerify,
  isBidder = false,
  children,
}: {
  bidders: CompetingBidderData[];
  tender: TenderSummaryInfo;
  canVerify: boolean;
  isBidder?: boolean;
  children: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<'list' | 'comparison'>('list');

  return (
    <div className="space-y-6">
      {/* Institutional Tab Switcher */}
      <div className="flex border-b border-line bg-surface-lowest pt-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'list'
                ? 'border-saffron text-saffron-800 bg-saffron/5 rounded-t-md'
                : 'border-transparent text-ink-muted hover:border-slate-300 hover:text-navy'
            }`}
          >
            <LayersIcon className="h-4 w-4" />
            <span>All Bidders ({bidders.length})</span>
          </button>

          {!isBidder && bidders.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveTab('comparison')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
                activeTab === 'comparison'
                  ? 'border-saffron text-saffron-800 bg-saffron/5 rounded-t-md'
                  : 'border-transparent text-ink-muted hover:border-slate-300 hover:text-navy'
              }`}
            >
              <ScaleIcon className="h-4 w-4" />
              <span>Bidder Comparison Matrix</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-mono leading-none ${
                  activeTab === 'comparison'
                    ? 'bg-saffron text-white'
                    : 'bg-surface-high text-ink-muted'
                }`}
              >
                {bidders.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'list' ? (
        children
      ) : (
        <BidderComparisonTab
          currentBidderId={bidders[0]?.id ?? ''}
          bidders={bidders}
          tender={tender}
          canVerify={canVerify}
          isBidder={isBidder}
        />
      )}
    </div>
  );
}
