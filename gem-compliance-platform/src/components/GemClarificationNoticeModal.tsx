'use client';

import { useState } from 'react';
import { SparkIcon, CheckIcon, CloseIcon, ShieldCheckIcon, DownloadIcon } from '@/components/icons';

interface Props {
  bidderName: string;
  tenderRef: string;
  tenderTitle: string;
  discrepancies: Array<{ label: string; reason: string }>;
}

export function GemClarificationNoticeModal({
  bidderName,
  tenderRef,
  tenderTitle,
  discrepancies,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [noticeType, setNoticeType] = useState<'clarification' | 'show_cause'>('clarification');

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const deadlineDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const discrepancyListText = discrepancies
    .map(
      (d, i) =>
        `   ${i + 1}. Requirement: ${d.label}\n      Identified Discrepancy: ${d.reason}`
    )
    .join('\n\n');

  const clarificationNotice = `GOVERNMENT E-MARKETPLACE (GeM)
CPCL PROCUREMENT & VIGILANCE DIVISION
Ref No: CPCL/PROC/CLARIF/${tenderRef.replace(/[^A-Z0-9]/gi, '_')}/${Date.now().toString().slice(-4)}
Date: ${currentDate}

FORMAL CLARIFICATION / SHORTFALL REPRESENTATION NOTICE
[Issued in accordance with GeM General Terms & Conditions (GTC) Clause 19 & CVC Public Procurement Guidelines]

To,
The Authorized Signatory,
${bidderName}

Subject: Request for Clarification & Rectification regarding Bid Submission under GeM Bid No: ${tenderRef}
Tender Title: ${tenderTitle}

Dear Sir/Madam,

During technical compliance evaluation by the Procurement Committee for the aforementioned tender, the following discrepancy/shortfall was detected across your statutory filings and declared documents:

${discrepancyListText}

In the interest of natural justice and fair public procurement under the Public Procurement Policy (PPP-MSE Order 2012 / GeM GTC):

1. You are hereby afforded a statutory window of 48 (Forty-Eight) Hours to submit formal written representation and upload rectified statutory certificates.
2. Rectification deadline: ${deadlineDate}, 17:00 IST.
3. Submissions must be uploaded via the GeM Seller Representation portal or directly submitted to the Competent Procurement Authority.
4. Failure to furnish verifiable documentary clarification within the stipulated timeframe shall lead to technical disqualification of your bid without further correspondence.

Issued with the approval of the Competent Procurement Authority.
Chennai Petroleum Corporation Limited (CPCL) / GeM Procurement Division`;

  const showCauseNotice = `GOVERNMENT E-MARKETPLACE (GeM)
CPCL PROCUREMENT & VIGILANCE DIVISION
Ref No: CPCL/VIG/SHOW-CAUSE/${tenderRef.replace(/[^A-Z0-9]/gi, '_')}/${Date.now().toString().slice(-4)}
Date: ${currentDate}

FORMAL SHOW-CAUSE NOTICE FOR TECHNICAL DISQUALIFICATION
[Issued under Rule 175 of General Financial Rules (GFR 2017) & CVC Procurement Integrity Pact]

To,
The Managing Director / Authorized Signatory,
${bidderName}

Subject: Show-Cause Notice against Disqualification / Rejection of Bid under GeM Bid No: ${tenderRef}
Tender Title: ${tenderTitle}

WHEREAS your enterprise submitted a technical bid under the aforementioned tender for Chennai Petroleum Corporation Limited (CPCL);

AND WHEREAS automated and documentary statutory audit through the National Compliance Gateway revealed critical non-compliance / false declaration:

${discrepancyListText}

NOW THEREFORE, take notice that your bid is liable for SUMMARY REJECTION and debarment reporting on the GeM Incident Management Portal under GeM GTC Clause 19 and CVC guidelines.

You are called upon to show cause in writing within 3 (Three) Business Days as to why:
(a) Your bid should not be rejected on technical grounds; and
(b) Your enterprise should not be debarred from participating in CPSE tenders for a period up to 2 years.

Your written reply with authenticated supporting exhibits must reach the undersigned on or before ${deadlineDate}, 17:00 IST. If no response is received, the matter shall be decided ex-parte on available records.

By Order of the Competent Authority,
Procurement & Contracts Committee
Chennai Petroleum Corporation Limited (MoP&NG)`;

  const activeNoticeText = noticeType === 'clarification' ? clarificationNotice : showCauseNotice;
  const [editedText, setEditedText] = useState(activeNoticeText);

  // Keep edited text in sync when switching tabs if unchanged
  const handleTypeChange = (type: 'clarification' | 'show_cause') => {
    setNoticeType(type);
    setEditedText(type === 'clarification' ? clarificationNotice : showCauseNotice);
  };

  function handleCopy() {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${noticeType === 'clarification' ? 'Clarification Notice' : 'Show Cause Notice'} - ${bidderName}</title>
          <style>
            body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.5; padding: 40px; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 25px; }
            .header h2 { margin: 0 0 5px 0; font-size: 16pt; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 2px 0; font-size: 11pt; }
            pre { font-family: 'Times New Roman', serif; white-space: pre-wrap; word-wrap: break-word; font-size: 12pt; line-height: 1.6; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Government e-Marketplace (GeM)</h2>
            <p><strong>Chennai Petroleum Corporation Limited (CPCL)</strong></p>
            <p>Ministry of Petroleum & Natural Gas, Government of India</p>
          </div>
          <pre>${editedText}</pre>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setEditedText(activeNoticeText);
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-saffron/40 bg-saffron/10 px-3 py-1.5 text-xs font-semibold text-saffron-900 hover:bg-saffron/20 active:scale-95 transition-all shadow-2xs cursor-pointer"
      >
        <SparkIcon className="h-3.5 w-3.5 text-saffron-800" />
        <span>AI Action: Draft GeM Notice (Clause 19)</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl border border-line bg-surface-lowest p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-saffron/15 text-saffron-800">
                    <SparkIcon className="h-4 w-4" />
                  </span>
                  <span className="rounded bg-saffron/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-saffron-800">
                    AI Legal Workflow Automation
                  </span>
                </div>
                <h3 className="mt-1 font-heading text-lg font-bold text-navy">
                  GeM Representation & Statutory Shortfall Notice
                </h3>
                <p className="text-xs text-ink-muted">
                  Auto-drafted formal notice with legal citations under <strong>GeM GTC Clause 19</strong> for {bidderName}.
                </p>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-ink-muted hover:bg-surface-low hover:text-navy transition-colors cursor-pointer"
                aria-label="Close"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Template Selector Tabs */}
            <div className="mt-3 flex items-center gap-2 border-b border-line pb-2">
              <button
                type="button"
                onClick={() => handleTypeChange('clarification')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  noticeType === 'clarification'
                    ? 'bg-navy text-white shadow-2xs'
                    : 'bg-surface text-ink-muted hover:text-ink'
                }`}
              >
                1. Clarification & Representation (48hr Window)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('show_cause')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  noticeType === 'show_cause'
                    ? 'bg-rose-700 text-white shadow-2xs'
                    : 'bg-surface text-ink-muted hover:text-ink'
                }`}
              >
                2. Show-Cause Notice (GFR Rule 175)
              </button>
            </div>

            {/* Notice Body Textarea */}
            <div className="mt-3 flex-1 overflow-hidden flex flex-col">
              <label className="text-[11px] font-semibold text-ink-muted mb-1 flex items-center justify-between">
                <span>Formal Notice Text (Editable by Procurement Officer):</span>
                <span className="text-[10px] text-ink-faint">Directly exportable to PDF / Letterhead</span>
              </label>
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={14}
                className="w-full flex-1 rounded-lg border border-line bg-surface-low p-3.5 font-mono text-[11px] leading-relaxed text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy resize-none"
              />
            </div>

            {/* Modal Footer */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-line">
              <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                <ShieldCheckIcon className="h-4 w-4 text-india-green" />
                <span>Compliant with CVC & GeM GTC Clause 19 Guidelines</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-lowest px-3 py-2 text-xs font-semibold text-navy hover:bg-surface-low active:scale-95 transition-all shadow-2xs cursor-pointer"
                  title="Print official letterhead document"
                >
                  <DownloadIcon className="h-3.5 w-3.5 text-navy" />
                  <span>Print / Letterhead PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy/90 active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  {copied ? <CheckIcon className="h-3.5 w-3.5 text-india-green" /> : null}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Notice Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-line bg-surface-lowest px-3 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-low cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
