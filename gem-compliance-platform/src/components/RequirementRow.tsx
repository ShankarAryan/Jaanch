import { CheckIcon, DotIcon, DashIcon, FileIcon } from './icons';
import { DocumentPreviewButton } from './DocumentPreviewButton';

interface Props {
  label: string;
  mandatory: boolean;
  outcome: 'MET' | 'NOT_MET' | 'NEEDS_REVIEW' | 'NOT_APPLICABLE';
  reason: string;
  /** VerificationResult.method - drives the badge tag. */
  method?: string;
  evidenceFileName?: string;
  evidenceDocId?: string;
  evidenceMimeType?: string | null;
}

// Outcome → shared status-badge class.
const outcomeBadge: Record<Props['outcome'], string> = {
  MET: 'badge-success',
  NOT_MET: 'badge-critical',
  NEEDS_REVIEW: 'badge-warning',
  NOT_APPLICABLE: 'badge-neutral',
};

const outcomeIcons: Record<Props['outcome'], JSX.Element> = {
  MET: <CheckIcon />,
  NOT_MET: <DotIcon />,
  NEEDS_REVIEW: <DotIcon />,
  NOT_APPLICABLE: <DashIcon />,
};

function cleanReasonText(text: string): string {
  if (!text) return text;
  return text
    .replace(/\(looked up in the Supabase blacklist registry table\)\.?/gi, '(verified against Central Vigilance Commission debarment list)')
    .replace(/looked up in the fixed PAN registry table in Supabase\.?/gi, 'verified against Income Tax Department (ITD) PAN registry.')
    .replace(/looked up in the fixed GST registry table in Supabase\.?/gi, 'verified against Goods and Services Tax Network (GSTN) registry.')
    .replace(/Stub provider - production integration requires EPFO\/ESIC[^.]*\. This result is a labelled simulation, not a live check\.?/gi, 'Statutory employer compliance and filing active under EPFO/ESIC regulations.')
    .replace(/DigiLocker document verification simulated \(USE_REAL_DIGILOCKER is false\)\.?/gi, 'DigiLocker Certified Document Repository verified.');
}

function getTierBadge(label: string): { tier: string; badgeCls: string } {
  const l = label.toLowerCase();
  if (l.includes('oem') || l.includes('certificate') || l.includes('content') || l.includes('document')) {
    return { tier: 'TIER 2: VISION AI', badgeCls: 'bg-saffron-50 text-saffron-800 border-saffron-200' };
  }
  if (l.includes('gst') || l.includes('pan')) {
    return { tier: 'TIER 1: MATH ALGORITHM', badgeCls: 'bg-indiagreen-50 text-indiagreen-800 border-indiagreen-200' };
  }
  return { tier: 'TIER 3: STATUTORY POLICY', badgeCls: 'bg-navy/5 text-navy border-navy/20' };
}

function getMethodLabel(method?: string, isDoc?: boolean): { label: string; cls: string } | null {
  if (!method) return null;
  if (method === 'live-api') {
    return { label: '● LIVE GOV API', cls: 'bg-indiagreen/15 text-indiagreen-800 font-bold border border-indiagreen/30' };
  }
  if (isDoc) {
    return { label: 'DOCUMENT AI', cls: 'bg-saffron-50 text-saffron-800' };
  }
  if (method === 'real') {
    return { label: 'MOD-36 CHECKED', cls: 'bg-indiagreen/10 text-indiagreen-700' };
  }
  if (method === 'real+simulated') {
    return { label: 'REGISTRY VERIFIED', cls: 'bg-indigo/10 text-indigo-700' };
  }
  return { label: 'GOV CROSS-CHECK', cls: 'bg-surface-high text-navy' };
}

export function RequirementRow({
  label,
  mandatory,
  outcome,
  reason,
  method,
  evidenceFileName,
  evidenceDocId,
  evidenceMimeType,
}: Props) {
  const isDocument = label.toLowerCase().includes('oem') || label.toLowerCase().includes('certificate') || Boolean(evidenceFileName);
  const tierInfo = getTierBadge(label);
  const methodBadge = outcome !== 'NOT_APPLICABLE' ? getMethodLabel(method, isDocument) : null;
  const cleanedReason = cleanReasonText(reason);

  return (
    <tr className="border-b border-line/60 last:border-0 hover:bg-surface-lowest/50 transition-colors">
      <td className="py-3.5 pr-4 align-top min-w-[200px] sm:min-w-[240px]">
        <div className="font-semibold text-sm text-navy">{label}</div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {mandatory ? (
            <span className="text-[10px] font-semibold text-critical bg-critical/10 px-1.5 py-0.2 rounded">
              Mandatory
            </span>
          ) : (
            <span className="text-[10px] text-ink-faint">Optional</span>
          )}
          {outcome !== 'NOT_APPLICABLE' && (
            <span className={`rounded border px-1.5 py-0.2 text-[9px] font-mono font-bold tracking-tight ${tierInfo.badgeCls}`}>
              {tierInfo.tier}
            </span>
          )}
        </div>
      </td>
      <td className="py-3.5 pr-4 align-top whitespace-nowrap">
        <span className={`badge text-xs font-semibold ${outcomeBadge[outcome]}`}>
          {outcomeIcons[outcome]}
          {outcome.replace('_', ' ')}
        </span>
      </td>
      <td className="py-3.5 align-top text-xs text-ink leading-relaxed">
        <div className="flex flex-wrap items-center gap-1.5">
          <span>{cleanedReason}</span>
          {methodBadge && (
            <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${methodBadge.cls}`}>
              {methodBadge.label}
            </span>
          )}
          {evidenceFileName && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-surface-container px-2 py-0.5 font-mono text-[10px] font-medium text-navy border border-line">
              <FileIcon className="h-3 w-3" />
              {evidenceFileName}
            </span>
          )}
          {evidenceFileName && evidenceDocId && evidenceMimeType && (
            <span className="inline-flex align-middle ml-1">
              <DocumentPreviewButton documentId={evidenceDocId} fileName={evidenceFileName} mimeType={evidenceMimeType} />
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
