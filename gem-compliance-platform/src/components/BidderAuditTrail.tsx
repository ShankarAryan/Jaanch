'use client';

import { useState } from 'react';
import { TimelineIcon, CheckIcon, AlertTriangleIcon, UserIcon, SparkIcon } from '@/components/icons';

interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  details: string;
  createdAt: string | Date;
}

interface Props {
  logs: AuditEntry[];
}

function formatAuditAction(action: string, actor: string, rawDetails: string) {
  let parsed: Record<string, any> = {};
  try {
    parsed = JSON.parse(rawDetails);
  } catch {
    /* raw string */
  }

  if (action === 'PO_DECISION_RECORDED') {
    return {
      title: `Officer Adjudication: ${parsed.outcome || 'Decision Recorded'}`,
      subtitle: parsed.remarks ? `Remarks: "${parsed.remarks}"` : 'Official decision recorded under GeM GTC',
      actorLabel: `${actor} (Procurement Officer)`,
      badge: parsed.outcome === 'QUALIFIED' ? 'badge-success' : parsed.outcome === 'DISQUALIFIED' ? 'badge-critical' : 'badge-warning',
      badgeText: parsed.outcome || 'DECISION',
      icon: <UserIcon className="h-4 w-4 text-navy" />,
    };
  }

  if (action === 'SCORE_COMPUTED') {
    return {
      title: 'AI Multi-Tier Risk Score Synthesized',
      subtitle: parsed.riskLevel ? `Risk Tier: ${parsed.riskLevel} · Score: ${parsed.complianceScore ?? ''}/100` : 'Automated synthesis across math, vision, and statutory policy',
      actorLabel: 'AI Compliance Engine',
      badge: parsed.riskLevel === 'LOW' ? 'badge-success' : parsed.riskLevel === 'HIGH' ? 'badge-critical' : 'badge-warning',
      badgeText: parsed.riskLevel ? `${parsed.riskLevel} RISK` : 'AI COMPUTED',
      icon: <SparkIcon className="h-4 w-4 text-saffron-800" />,
    };
  }

  if (action === 'REQUIREMENT_CHECKED') {
    const code = parsed.code || 'STATUTORY_CHECK';
    const cleanCode = code.replace(/_/g, ' ');
    const outcome = parsed.outcome || parsed.status || 'VERIFIED';
    return {
      title: `Check Executed: ${cleanCode}`,
      subtitle: parsed.method ? `Method: ${parsed.method} · Source: ${parsed.sourceType || 'Registry'}` : 'Statutory cross-check performed',
      actorLabel: 'Automated Rules & Registry Engine',
      badge: outcome === 'MET' || outcome === 'VERIFIED_OK' ? 'badge-success' : outcome === 'NOT_MET' || outcome === 'MISSING' ? 'badge-critical' : 'badge-warning',
      badgeText: outcome,
      icon: outcome === 'MET' || outcome === 'VERIFIED_OK' ? <CheckIcon className="h-4 w-4 text-indiagreen-700" /> : <AlertTriangleIcon className="h-4 w-4 text-critical" />,
    };
  }

  if (action === 'DOCUMENT_UPLOADED') {
    return {
      title: `Document Uploaded: ${parsed.fileName || parsed.docType || 'File'}`,
      subtitle: parsed.extractedSummary || 'Multimodal vision OCR extraction triggered',
      actorLabel: actor,
      badge: 'badge-neutral',
      badgeText: 'DOCUMENT',
      icon: <TimelineIcon className="h-4 w-4 text-navy" />,
    };
  }

  if (action === 'VERIFICATION_STARTED') {
    return {
      title: 'Compliance Verification Pipeline Initialized',
      subtitle: 'Execution across Tier 1 (Math), Tier 2 (Vision OCR), and Tier 3 (Statutory Rules)',
      actorLabel: 'Orchestration Gateway',
      badge: 'badge-neutral',
      badgeText: 'INITIALIZED',
      icon: <TimelineIcon className="h-4 w-4 text-navy" />,
    };
  }

  return {
    title: action.replace(/_/g, ' '),
    subtitle: rawDetails.slice(0, 80),
    actorLabel: actor,
    badge: 'badge-neutral',
    badgeText: action,
    icon: <TimelineIcon className="h-4 w-4 text-navy" />,
  };
}

export function BidderAuditTrail({ logs }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (logs.length === 0) {
    return (
      <div className="card">
        <h3 className="section-title">
          <TimelineIcon className="h-5 w-5" /> Statutory Compliance Audit Trail
        </h3>
        <p className="text-xs text-ink-muted">No audit entries recorded yet.</p>
      </div>
    );
  }

  const displayedLogs = isExpanded ? logs : logs.slice(0, 3);

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-line">
        <div>
          <h3 className="section-title mb-0 flex items-center gap-2">
            <TimelineIcon className="h-5 w-5 text-navy" />
            CVC Statutory & Vigilance Audit Trail
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Immutable, timestamped record of algorithmic checks, registry queries, and officer decisions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-ink-muted bg-surface-container px-2 py-0.5 rounded border border-line">
            {logs.length} logged events
          </span>
          {logs.length > 3 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-semibold text-navy hover:text-saffron-800 bg-surface px-2.5 py-1 rounded border border-line transition-colors"
            >
              {isExpanded ? 'Collapse Log' : `View All ${logs.length} Events →`}
            </button>
          )}
        </div>
      </div>

      <ol className="relative space-y-3 border-l-2 border-navy/20 ml-3 pl-5">
        {displayedLogs.map((log) => {
          const item = formatAuditAction(log.action, log.actor, log.details);
          const dateStr = new Date(log.createdAt).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          return (
            <li key={log.id} className="relative">
              <span
                className="absolute -left-[27px] top-2.5 h-2.5 w-2.5 rounded-full border-2 border-surface-lowest bg-navy"
                aria-hidden="true"
              />
              <div className="rounded-lg border border-line bg-surface p-3 transition-colors hover:border-navy/30">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0">{item.icon}</span>
                    <span className="text-xs font-bold text-navy">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-[9px] py-0 px-1.5 font-bold ${item.badge}`}>
                      {item.badgeText}
                    </span>
                    <span className="font-mono text-[10px] text-ink-faint">{dateStr}</span>
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-muted pt-1.5 border-t border-line/40">
                  <span className="truncate max-w-lg">{item.subtitle}</span>
                  <span className="font-mono text-[10px] text-ink-faint shrink-0">Actor: {item.actorLabel}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {!isExpanded && logs.length > 3 && (
        <div className="mt-3 text-center pt-2 border-t border-line/40">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-xs font-medium text-navy hover:underline"
          >
            + Show {logs.length - 3} earlier audit events (Registry queries & pipeline initialization)
          </button>
        </div>
      )}
    </div>
  );
}
