'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ClipboardIcon, ScaleIcon } from '@/components/icons';
import { BidderComparisonTab, type CompetingBidderData, type TenderSummaryInfo } from './BidderComparisonTab';

export function BidderDetailViewTabs({
  currentBidderId,
  competingBidders,
  tender,
  canVerify,
  isBidder = false,
  children,
}: {
  currentBidderId: string;
  competingBidders: CompetingBidderData[];
  tender: TenderSummaryInfo;
  canVerify: boolean;
  isBidder?: boolean;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTab = searchParams.get('tab') === 'comparison' ? 'comparison' : 'dossier';
  const [activeTab, setActiveTab] = useState<'dossier' | 'comparison'>(initialTab);

  // Sync state if URL changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'comparison' && activeTab !== 'comparison') {
      setActiveTab('comparison');
    } else if (tabParam !== 'comparison' && activeTab === 'comparison') {
      setActiveTab('dossier');
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'dossier' | 'comparison') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'comparison') {
      params.set('tab', 'comparison');
    } else {
      params.delete('tab');
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    router.replace(`${pathname}${query}`, { scroll: false });
  };

  const remainingCount = Math.max(0, competingBidders.length - 1);

  return (
    <div className="space-y-6">
      {/* Institutional Tab Bar */}
      <div className="flex border-b border-line bg-surface-lowest pt-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('dossier')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'dossier'
                ? 'border-saffron text-saffron-800 bg-saffron/5 rounded-t-md'
                : 'border-transparent text-ink-muted hover:border-slate-300 hover:text-navy'
            }`}
          >
            <ClipboardIcon className="h-4 w-4" />
            <span>Bidder Compliance Dossier</span>
          </button>

          {!isBidder && (
            <button
              type="button"
              onClick={() => handleTabChange('comparison')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
                activeTab === 'comparison'
                  ? 'border-saffron text-saffron-800 bg-saffron/5 rounded-t-md'
                  : 'border-transparent text-ink-muted hover:border-slate-300 hover:text-navy'
              }`}
            >
              <ScaleIcon className="h-4 w-4" />
              <span>Compare Remaining Bidders</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-mono leading-none ${
                  activeTab === 'comparison'
                    ? 'bg-saffron text-white'
                    : 'bg-surface-high text-ink-muted'
                }`}
              >
                {remainingCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'dossier' ? (
        children
      ) : (
        <BidderComparisonTab
          currentBidderId={currentBidderId}
          bidders={competingBidders}
          tender={tender}
          canVerify={canVerify}
          isBidder={isBidder}
        />
      )}
    </div>
  );
}
