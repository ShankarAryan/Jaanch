import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ScoreBadge } from '@/components/ScoreBadge';
import { RiskBadge } from '@/components/RiskBadge';
import { ScoreDonut } from '@/components/ScoreDonut';
import { VerifyButton } from '@/components/VerifyButton';
import { GemClarificationNoticeModal } from '@/components/GemClarificationNoticeModal';
import { RequirementRow } from '@/components/RequirementRow';
import { DecisionForm } from '@/components/DecisionForm';
import { BidderDocumentRepository } from '@/components/BidderDocumentRepository';
import { BidderAuditTrail } from '@/components/BidderAuditTrail';
import { ShieldCheckIcon, ClipboardIcon, SparkIcon } from '@/components/icons';
import type { RequirementEvaluation } from '@/lib/rulesEngine';
import { getSession } from '@/lib/session';
import { canViewBidder, canRunVerification, canUploadDocumentFor } from '@/lib/access';
import { BidderDetailViewTabs } from '@/components/BidderDetailViewTabs';
import { getCpseVendorIntelligence } from '@/lib/cpseIntelligence';
import { CpseIntelligenceCard } from '@/components/CpseIntelligenceCard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BidderDetailPage({ params }: { params: { id: string } }) {
  const bidder = await prisma.bidder.findUnique({
    where: { id: params.id },
    include: {
      tender: { include: { requirements: true } },
      // Exclude fileData (raw bytes) - the page only needs metadata + extracted fields.
      documents: {
        select: { id: true, docType: true, fileName: true, mimeType: true, rawText: true, extractedData: true },
      },
      verificationResults: { orderBy: { checkedAt: 'desc' } },
      scores: { orderBy: { computedAt: 'desc' }, take: 1 },
      decisions: { orderBy: { decidedAt: 'desc' } },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  if (!bidder) notFound();

  const session = getSession();
  const isBidder = session?.role === 'bidder';

  // The critical access check: a bidder may only ever open their own company's
  // page. Anything else - a guessed/edited URL for another company - is a 404,
  // server-side, before any of this bidder's data is rendered.
  if (!canViewBidder(session, bidder.companySlug)) notFound();

  // Competing bidders on the same tender for the Comparison Tab
  const competingBidders = await prisma.bidder.findMany({
    where: {
      tenderId: bidder.tenderId,
      ...(isBidder && session.companySlug ? { companySlug: session.companySlug } : {}),
    },
    include: {
      scores: { orderBy: { computedAt: 'desc' }, take: 1 },
      decisions: { orderBy: { decidedAt: 'desc' }, take: 1 },
      verificationResults: { orderBy: { checkedAt: 'desc' }, select: { requirementCode: true, status: true } },
      documents: { select: { id: true, docType: true, fileName: true, mimeType: true } },
    },
    orderBy: { name: 'asc' },
  });

  const latestScore = bidder.scores[0];
  const evaluations: RequirementEvaluation[] = latestScore ? JSON.parse(latestScore.breakdown) : [];

  // Same filter generateRecommendation() uses (recommendation.ts) - a
  // requirement "needs attention" unless it's MET or waived (NOT_APPLICABLE).
  const gapCount = evaluations.filter((e) => e.outcome !== 'MET' && e.outcome !== 'NOT_APPLICABLE').length;

  const cpseIntelligence = getCpseVendorIntelligence({
    name: bidder.name,
    pan: bidder.pan,
    gstin: bidder.gstin,
    slug: bidder.companySlug,
    isHighRiskSeed: latestScore?.riskLevel === 'HIGH' || (latestScore?.complianceScore !== undefined && latestScore.complianceScore < 70),
  });

  // docType -> document, for wiring the evidence filename onto the two
  // genuinely document-backed requirement rows below.
  const documentsByType = new Map(bidder.documents.map((d) => [d.docType, d]));

  // Latest VerificationResult per requirement code (results are ordered desc).
  const latestVr = new Map<string, (typeof bidder.verificationResults)[number]>();
  for (const vr of bidder.verificationResults) {
    if (!latestVr.has(vr.requirementCode)) latestVr.set(vr.requirementCode, vr);
  }
  const methodByCode = new Map<string, string>();
  for (const [code, vr] of latestVr) methodByCode.set(code, vr.method);


  // Is the Make-in-India local-content requirement waived for this tender?
  // If so, uploading a local-content certificate here is a dead end.
  const miiReq = bidder.tender.requirements.find((r) => r.code === 'MAKE_IN_INDIA_LOCAL_CONTENT');
  let miiWaived = false;
  try {
    miiWaived = miiReq ? JSON.parse(miiReq.ruleConfig)?.notApplicable === true : false;
  } catch {
    /* keep false */
  }
  const oemRequired = bidder.tender.requirements.some((r) => r.code === 'OEM_AUTHORIZATION' && r.mandatory);

  // Who can do what on this page (all also enforced server-side in
  // src/lib/actions.ts - the UI state here is a courtesy, not the guard).
  const canVerify = canRunVerification(session);
  const canUpload = canUploadDocumentFor(session, bidder.companySlug);
  const viewerNote = 'Read-only — only a Procurement Officer can do this. You are signed in as a Viewer.';

  const idField = (label: string, value: string | number | null | undefined) => (
    <div>
      <dt className="text-label uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm text-ink">{value ?? '—'}</dd>
    </div>
  );

  return (
    <div className="space-y-6 pb-24">
      <Link
        href={`/tenders/${bidder.tenderId}`}
        prefetch={true}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-navy"
      >
        <span>←</span>
        <span>Back to tender details</span>
      </Link>

      {/* Header */}
      <div className="card flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="mono-chip">{bidder.tender.referenceNo}</span>
            {latestScore && (
              <span className={`badge ${latestScore.riskLevel === 'HIGH' ? 'badge-critical' : latestScore.riskLevel === 'MEDIUM' ? 'badge-warning' : 'badge-success'}`}>
                {latestScore.riskLevel} risk
              </span>
            )}
          </div>
          <h1 className="font-heading text-h1 text-navy leading-tight">{bidder.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">{bidder.tender.title}</p>
          
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5 pt-3.5 border-t border-line/60">
            {idField('Udyam No.', bidder.udyamNumber)}
            {idField('GSTIN', bidder.gstin)}
            {idField('PAN', bidder.pan)}
            {idField('Claimed turnover', bidder.claimedTurnoverInrLakh != null ? `₹${bidder.claimedTurnoverInrLakh} Lakh` : null)}
            {idField('Workforce', bidder.claimedEmployeeCount != null ? `${bidder.claimedEmployeeCount} staff` : null)}
          </dl>
        </div>

        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-line/40">
          <div className="flex items-center gap-2">
            <ScoreBadge score={latestScore?.complianceScore ?? null} />
            <RiskBadge level={latestScore?.riskLevel ?? null} />
          </div>
          {session?.role === 'bidder' ? (
            <span className="text-[11px] text-ink-faint">Verification is run by the Procurement Officer.</span>
          ) : (
            <VerifyButton
              bidderId={bidder.id}
              bidderName={bidder.name}
              label={latestScore ? 'Re-run Verification' : 'Run Verification'}
              disabledReason={canVerify ? undefined : viewerNote}
            />
          )}
        </div>
      </div>

      <BidderDetailViewTabs
        currentBidderId={bidder.id}
        competingBidders={competingBidders as any}
        tender={{
          id: bidder.tender.id,
          referenceNo: bidder.tender.referenceNo,
          title: bidder.tender.title,
          category: bidder.tender.category,
          organization: bidder.tender.organization,
        }}
        canVerify={canVerify}
        isBidder={isBidder}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
          {/* ---- Main Column: AI Briefing + Verification Matrix + Documents + Audit ---- */}
          <div className="min-w-0 space-y-6">
            {/* 1. AI Executive Briefing & Shortfall Action Banner */}
            {latestScore && (
              <div
                className={`card border-l-4 ${
                  gapCount > 0
                    ? 'border-l-critical bg-critical/[0.03]'
                    : 'border-l-indiagreen-700 bg-indiagreen/[0.03]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3 pb-3 border-b border-line/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <SparkIcon className="h-5 w-5 text-navy" />
                      <h3 className="font-heading font-bold text-navy text-base">
                        AI Compliance Briefing & Automated Action
                      </h3>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Multi-tier algorithmic and document intelligence assessment for Procurement Officer support
                    </p>
                  </div>
                  {gapCount > 0 && (
                    <GemClarificationNoticeModal
                      bidderName={bidder.name}
                      tenderRef={bidder.tender.referenceNo}
                      tenderTitle={bidder.tender.title}
                      discrepancies={evaluations
                        .filter((e) => e.outcome !== 'MET' && e.outcome !== 'NOT_APPLICABLE')
                        .map((e) => ({
                          label: e.label,
                          reason: e.reason,
                        }))}
                    />
                  )}
                </div>
                <p className="whitespace-pre-line text-sm text-ink leading-relaxed">
                  {latestScore.aiRecommendation}
                </p>
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-line/40 text-xs text-ink-faint">
                  <span>Under GeM GTC Clause 19, the Procurement Officer retains final adjudication authority.</span>
                  <span
                    className={`font-semibold ${
                      gapCount > 0 ? 'text-critical' : 'text-indiagreen-700'
                    }`}
                  >
                    {gapCount === 0 ? '✓ Zero Shortfalls' : `⚠ ${gapCount} Actionable Shortfall`}
                  </span>
                </div>
              </div>
            )}

            {/* CPSE Cross-Enterprise Intelligence for MoP&NG / CPCL */}
            <CpseIntelligenceCard intelligence={cpseIntelligence} />

            {/* 2. Unified Statutory & Tender Compliance Matrix */}
            <div className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-line">
                <div>
                  <h3 className="section-title mb-0 flex items-center gap-2">
                    <ClipboardIcon className="h-5 w-5 text-navy" />
                    Compliance & Statutory Verification Matrix
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Live verification against Government registries (GSTN, ITD, Udyam, CVC) and tender criteria
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-surface-container px-2 py-1 font-mono text-ink-muted">
                    {evaluations.length} total criteria
                  </span>
                  <span
                    className={`rounded px-2 py-1 font-semibold ${
                      gapCount > 0
                        ? 'bg-critical/10 text-critical'
                        : 'bg-indiagreen/10 text-indiagreen-700'
                    }`}
                  >
                    {gapCount > 0 ? `${gapCount} Discrepancy` : 'All Satisfied'}
                  </span>
                </div>
              </div>

              {evaluations.length === 0 ? (
                <p className="text-sm text-ink-muted py-4">
                  {session?.role === 'bidder'
                    ? 'No verification run yet — the Procurement Officer runs the compliance checks once your documents are in.'
                    : 'No verification run yet — click "Run Verification" above.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <tbody>
                      {evaluations.map((e) => {
                        const evidenceDoc =
                          e.code === 'OEM_AUTHORIZATION'
                            ? documentsByType.get('OEM_AUTHORIZATION_CERTIFICATE')
                            : e.code === 'MAKE_IN_INDIA_LOCAL_CONTENT'
                              ? documentsByType.get('LOCAL_CONTENT_CERTIFICATE')
                              : e.code === 'GST_FILING'
                                ? documentsByType.get('GST_CERTIFICATE')
                                : e.code === 'PAN_IT_COMPLIANCE'
                                  ? documentsByType.get('PAN_CARD')
                                  : e.code === 'UDYAM_STATUS'
                                    ? documentsByType.get('UDYAM_CERTIFICATE')
                                    : e.code.includes('EPFO') || e.code.includes('ESIC')
                                      ? documentsByType.get('EPFO_ESIC_CHALLAN')
                                      : e.code.includes('STARTUP')
                                        ? documentsByType.get('STARTUP_INDIA_CERTIFICATE')
                                        : e.code.includes('NSIC')
                                          ? documentsByType.get('NSIC_CERTIFICATE')
                                          : e.code.includes('DIGILOCKER')
                                            ? documentsByType.get('DIGILOCKER_CERTIFICATE')
                                            : e.code.includes('BIS') || e.code.includes('QUALITY')
                                              ? documentsByType.get('BIS_QUALITY_CERTIFICATE')
                                              : undefined;
                        return (
                          <RequirementRow
                            key={e.code}
                            label={e.label}
                            mandatory={e.mandatory}
                            outcome={e.outcome}
                            reason={e.reason}
                            method={methodByCode.get(e.code)}
                            evidenceFileName={evidenceDoc?.fileName}
                            evidenceDocId={evidenceDoc?.id}
                            evidenceMimeType={evidenceDoc?.mimeType}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. Document Dossier & Multimodal AI Verification */}
            <BidderDocumentRepository
              bidderId={bidder.id}
              documents={bidder.documents}
              oemRequired={oemRequired}
              miiWaived={miiWaived}
              canUpload={canUpload}
              viewerNote={viewerNote}
            />

            {/* 4. CVC Statutory & Vigilance Audit Trail */}
            <BidderAuditTrail logs={bidder.auditLogs as any} />
          </div>

          {/* ---- Sticky Right Sidebar: Score + Immediate Officer Adjudication ---- */}
          <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
            {/* Score & Risk Card */}
            <div className="card border-line/80 bg-surface-lowest/80 shadow-rail backdrop-blur-sm">
              {latestScore ? (
                <>
                  <ScoreDonut score={latestScore.complianceScore} riskLevel={latestScore.riskLevel} />
                  <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Verification Status</span>
                    <span
                      className={`font-semibold ${
                        gapCount > 0 ? 'text-critical' : 'text-indiagreen-700'
                      }`}
                    >
                      {gapCount === 0 ? 'All Checks Passed' : `${gapCount} Shortfall Detected`}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded bg-navy/10 text-navy">
                    <ShieldCheckIcon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-ink">Not yet scored</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {session?.role === 'bidder'
                      ? 'The Procurement Officer runs verification once your documents are in.'
                      : 'Run verification to compute this bidder’s compliance score.'}
                  </p>
                </div>
              )}
            </div>

            {/* Officer Decision Form (Sticky in view while officer examines findings!) */}
            {session?.role !== 'bidder' && (
              <DecisionForm
                bidderId={bidder.id}
                officerName={session?.name ?? ''}
                canRecord={session?.role === 'officer'}
              />
            )}

            {/* Adjudication History */}
            <div className="card">
              <h3 className="section-title text-sm mb-3">
                <ClipboardIcon className="h-4 w-4" /> Adjudication History
              </h3>
              {bidder.decisions.length === 0 ? (
                <p className="text-xs text-ink-muted">No decision recorded yet.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {bidder.decisions.map((d) => (
                    <li key={d.id} className="rounded border border-line bg-surface p-2.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-semibold ${
                            d.outcome === 'QUALIFIED'
                              ? 'text-indiagreen-700'
                              : d.outcome === 'DISQUALIFIED'
                                ? 'text-critical'
                                : 'text-saffron-800'
                          }`}
                        >
                          {d.outcome}
                        </span>
                        <span className="text-[10px] text-ink-faint">
                          {new Date(d.decidedAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-muted mt-0.5">{d.officerName}</div>
                      {d.remarks && <p className="mt-1 text-[11px] text-ink italic">&quot;{d.remarks}&quot;</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </BidderDetailViewTabs>
    </div>
  );
}
