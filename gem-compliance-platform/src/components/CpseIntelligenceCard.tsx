'use client';

import React, { useState } from 'react';
import { CpseVendorIntelligence } from '@/lib/cpseIntelligence';
import { BankIcon, CheckCircleIcon, CrossCircleIcon, ClockIcon, ShieldIcon } from '@/components/icons';

export function CpseIntelligenceCard({ intelligence }: { intelligence: CpseVendorIntelligence }) {
  const [showAllEngagements, setShowAllEngagements] = useState(false);

  const isLowRisk = intelligence.riskCategory === 'LOW_RISK';
  const isHighRisk = intelligence.riskCategory === 'HIGH_RISK';

  return (
    <div className="card space-y-4 border border-line bg-surface-lowest shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-navy/10 flex items-center justify-center text-navy shrink-0">
            <BankIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm font-bold text-navy uppercase tracking-wider">
                CPSE Cross-Enterprise Intelligence
              </h3>
              <span className="badge badge-neutral text-[10px] uppercase font-mono">MoP&NG Hub</span>
            </div>
            <p className="text-xs text-ink-muted">
              Historical performance, vigilance records & debarment telemetry across Oil & Gas PSUs (CPCL, ONGC, IOCL, GAIL).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] uppercase text-ink-faint font-semibold block">Integrity Index</span>
            <span className={`text-base font-bold font-heading ${isLowRisk ? 'text-india-green' : isHighRisk ? 'text-rose-600' : 'text-amber-600'}`}>
              {intelligence.overallIntegrityScore}/100
            </span>
          </div>
          <span
            className={`badge text-[10px] font-bold uppercase ${
              isLowRisk ? 'badge-success' : isHighRisk ? 'badge-danger' : 'badge-warning'
            }`}
          >
            {intelligence.riskCategory.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white rounded border border-line">
          <span className="text-ink-faint text-[10px] uppercase font-semibold block">PSU Engagements</span>
          <span className="font-bold text-ink text-sm mt-0.5 block">{intelligence.totalCpseEngagements} Contracts</span>
          <span className="text-[11px] text-ink-muted">Audited: {intelligence.totalContractValueAudited}</span>
        </div>

        <div className="p-3 bg-white rounded border border-line">
          <span className="text-ink-faint text-[10px] uppercase font-semibold block">CVC Vigilance Status</span>
          <span className={`font-bold text-xs mt-1 inline-flex items-center gap-1 ${intelligence.debarmentStatus === 'NO_ACTIVE_DEBARMENT' ? 'text-india-green' : 'text-rose-600'}`}>
            {intelligence.debarmentStatus === 'NO_ACTIVE_DEBARMENT' ? (
              <>
                <CheckCircleIcon className="h-3.5 w-3.5" />
                <span>Nil Adverse Orders</span>
              </>
            ) : (
              <>
                <CrossCircleIcon className="h-3.5 w-3.5" />
                <span>Active Inquiry</span>
              </>
            )}
          </span>
          <span className="text-[10px] text-ink-faint block mt-0.5">Central Vigilance Commission</span>
        </div>

        <div className="p-3 bg-white rounded border border-line">
          <span className="text-ink-faint text-[10px] uppercase font-semibold block">Avg Delivery Milestone</span>
          <span className="font-bold text-ink text-sm mt-0.5 block">{intelligence.avgDeliveryRating} / 5.0</span>
          <span className="text-[11px] text-india-green font-medium">Timely Execution</span>
        </div>

        <div className="p-3 bg-white rounded border border-line">
          <span className="text-ink-faint text-[10px] uppercase font-semibold block">Performance Guarantee</span>
          <span className={`font-bold text-xs mt-1 block ${intelligence.perfGuaranteeDefaulter ? 'text-rose-600' : 'text-india-green'}`}>
            {intelligence.perfGuaranteeDefaulter ? 'Defaulter History' : 'Zero Default Record'}
          </span>
          <span className="text-[10px] text-ink-faint block mt-0.5">e-PBG Verified</span>
        </div>
      </div>

      {/* AI Advisory Summary */}
      <div className="p-3 bg-navy/5 border-l-4 border-navy rounded-r text-xs text-ink leading-relaxed">
        <span className="font-bold text-navy uppercase text-[10px] tracking-wide block mb-0.5">
          AI Enterprise Procurement Advisory:
        </span>
        {intelligence.aiIntegritySummary}
      </div>

      {/* Cross-CPSE Track Record Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-ink uppercase tracking-wider">
            Recent Oil & Gas CPSE Procurements Track Record:
          </span>
          {intelligence.engagements.length > 2 && (
            <button
              type="button"
              onClick={() => setShowAllEngagements(!showAllEngagements)}
              className="text-[11px] text-navy hover:underline font-medium cursor-pointer"
            >
              {showAllEngagements ? 'Show Less' : `View All (${intelligence.engagements.length})`}
            </button>
          )}
        </div>

        <div className="border border-line rounded-lg overflow-hidden bg-white text-xs">
          <table className="w-full text-left">
            <thead className="bg-surface text-ink-muted uppercase text-[10px] font-semibold border-b border-line">
              <tr>
                <th className="px-3 py-2">Procuring CPSE</th>
                <th className="px-3 py-2">Tender Ref / Sector</th>
                <th className="px-3 py-2">Contract Value</th>
                <th className="px-3 py-2">Completion Record</th>
                <th className="px-3 py-2">CVC Vigilance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(showAllEngagements ? intelligence.engagements : intelligence.engagements.slice(0, 2)).map(
                (eng, idx) => (
                  <tr key={idx} className="hover:bg-surface-lowest">
                    <td className="px-3 py-2.5 font-medium text-ink">{eng.cpseName}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[11px] text-ink">{eng.tenderRef}</span>
                      <span className="text-ink-muted block text-[10px]">{eng.sector}</span>
                    </td>
                    <td className="px-3 py-2.5 font-bold font-mono text-ink">{eng.contractValue}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          eng.completionStatus === 'SATISFACTORY' || eng.completionStatus === 'COMPLETED_ON_TIME'
                            ? 'bg-india-green/10 text-india-green'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {eng.completionStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`text-[11px] font-medium ${
                          eng.cvcStatus === 'CLEAN' ? 'text-india-green' : 'text-rose-600 font-semibold'
                        }`}
                      >
                        {eng.cvcStatus === 'CLEAN' ? '✓ Clean Record' : '⚠ Scrutiny Flag'}
                      </span>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
