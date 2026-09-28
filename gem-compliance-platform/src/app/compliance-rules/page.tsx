import { ScaleIcon, CheckIcon, ShieldCheckIcon } from '@/components/icons';

export default function ComplianceRulesPage() {
  const rules = [
    {
      code: 'GST_FILING',
      name: 'GST Registration & Return Filing Compliance',
      authority: 'Goods and Services Tax Network (GSTN) / Central Board of Indirect Taxes and Customs',
      mandatory: 'Mandatory Gate',
      method: 'Real Mod-36 Algorithm + Registry Lookup',
      description:
        'Validates that the 15-character GSTIN is mathematically valid using the official Luhn Mod-36 checksum, checks that the embedded PAN (chars 3–12) exactly matches the bidder PAN, and confirms returns (GSTR-3B/GSTR-1) are not delayed beyond the 2-month threshold.',
      thresholds: [
        'Structure: 2 digits (state) + 10 alphanumeric (PAN) + 1 entity num + "Z" + 1 check digit',
        'Checksum: Real Mod-36 algorithm verified against published GSTN checksum tables',
        'Filing Currency: Max allowable filing delay is 2 months (configurable per tender)',
      ],
      impact: 'Critical statutory gate. Checksum or filing failure drops bidder to HIGH RISK and flags NOT MET.',
    },
    {
      code: 'PAN_IT_COMPLIANCE',
      name: 'Permanent Account Number (PAN) Statutory Validity',
      authority: 'Income Tax Department / Central Board of Direct Taxes (CBDT)',
      mandatory: 'Mandatory Gate',
      method: 'Real ITD Algorithm + Verification',
      description:
        'Validates structural correctness of the 10-character PAN, decodes the 4th character entity holder type (C=Company, F=Firm, P=Person, A=AOP, T=Trust), and verifies consistency with enterprise declarations.',
      thresholds: [
        'Regex: ^[A-Z]{3}[ABCFGHLJPT][A-Z][0-9]{4}[A-Z]$',
        'Entity consistency: Must align with corporate incorporation type and GSTIN state identity',
      ],
      impact: 'Mandatory gate. Invalid format results in immediate disqualification recommendation.',
    },
    {
      code: 'MAKE_IN_INDIA_LOCAL_CONTENT',
      name: 'Public Procurement (Preference to Make in India) Order 2017',
      authority: 'Department for Promotion of Industry and Internal Trade (DPIIT) / Ministry of Commerce & Industry',
      mandatory: 'Tender-Configured / CA Waived',
      method: 'Real Multimodal AI Document Extraction + DPIIT Fixtures',
      description:
        'Categorizes suppliers into Class-I (≥50% local content) and Class-II (20%–50%). Allows automated extraction from uploaded CA/Statutory Auditor certificates and respects Competent Authority Global Tender waivers under GFR-2017 Rule 161(iv)(b).',
      thresholds: [
        'Class-I Local Supplier: Local content ≥ 50% (eligible for L1+20% price match up to 50% qty)',
        'Class-II Local Supplier: Local content between 20% and 49%',
        'Competent Authority Waiver: Excluded from evaluation if officially waived with approval number',
      ],
      impact: 'Drives purchase preference eligibility. Waived tenders display approval number with 0 penalty.',
    },
    {
      code: 'UDYAM_STATUS',
      name: 'Public Procurement Policy for Micro and Small Enterprises (MSEs) Order 2012',
      authority: 'Ministry of Micro, Small and Medium Enterprises (MSME)',
      mandatory: 'Purchase Preference Signal',
      method: 'Simulated Registry + Fuzzy Entity Name Check',
      description:
        'Verifies active Udyam registration, flags discrepancies between bidder legal name and registered enterprise name, and determines eligibility for L1+15% price preference and turnover/experience waivers.',
      thresholds: [
        'Format: UDYAM-XX-00-0000000',
        'Name Check: Catches typographical mismatches (e.g. "Fabricators" vs "Febricators")',
        'Benefits: Price matching within L1+15% band for up to 25% order quantity',
      ],
      impact: 'Informational on global bids, eligibility gate on MSE-reserved bids. Typo triggers NEEDS REVIEW.',
    },
    {
      code: 'OEM_AUTHORIZATION',
      name: 'Original Equipment Manufacturer (OEM) Authorization',
      authority: 'GeM Specific Additional Terms & Conditions (STC) / Schedule of Requirements',
      mandatory: 'Bid-Specific Mandatory Document',
      method: 'Real Multimodal LLM Letter Parsing (Gemini Vision)',
      description:
        'When an OEM certificate is uploaded, multimodal AI reads the document, assesses if it is a genuine manufacturer authorization letter, and validates that the authorized company name matches the bidding entity.',
      thresholds: [
        'Document Plausibility: Confirms manufacturer letterhead, signature, and authorizing intent',
        'Name Matching: Exact or high-confidence fuzzy match of authorized seller name',
      ],
      impact: 'Mandatory where specified. Uploaded valid letter returns MET; missing or fake letter flagged.',
    },
    {
      code: 'BLACKLIST_CHECK',
      name: 'Debarment & Blacklisting Cross-Reference',
      authority: 'Central Vigilance Commission (CVC) / Ministry of Finance OM / GeM Debarment List',
      mandatory: 'Mandatory Gate',
      method: 'CVC / Ministry Database Lookup',
      description:
        'Cross-checks bidder enterprise name and corporate promoters against active debarment orders issued across central ministries, state undertakings, and GeM incident management platform.',
      thresholds: [
        'Status: Clean record required. Any active debarment period disqualifies participation.',
      ],
      impact: 'Instant disqualification gate. Dropped directly to HIGH RISK with formal disqualification advice.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <ScaleIcon className="h-6 w-6 text-navy" />
          <h1 className="font-heading text-2xl font-bold text-navy">Statutory Compliance Matrix</h1>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Government of India procurement directives, statutory rules, and validation logic active within the GeM compliance engine.
        </p>
      </div>

      {/* Rules Accordion / Cards */}
      <div className="grid gap-5">
        {rules.map((r) => (
          <div
            key={r.code}
            className="rounded-lg border border-line bg-surface-lowest p-5 shadow-card transition-colors hover:border-navy/40"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="rounded bg-navy/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-navy">
                  {r.code}
                </span>
                <h3 className="mt-1 font-heading text-base font-bold text-ink">{r.name}</h3>
                <p className="text-xs text-ink-faint mt-0.5">{r.authority}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-surface-high px-2.5 py-0.5 text-[11px] font-medium text-ink">
                  {r.mandatory}
                </span>
                <span className="rounded-full bg-saffron/10 px-2.5 py-0.5 text-[11px] font-medium text-saffron-800 border border-saffron/20">
                  {r.method}
                </span>
              </div>
            </div>

            <p className="mt-3 text-xs text-ink leading-relaxed">{r.description}</p>

            <div className="mt-4 rounded-md border border-line/60 bg-surface-low/50 p-3 text-xs space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint block">
                Validation Thresholds & Logic
              </span>
              <ul className="list-inside list-disc space-y-1 text-ink-muted">
                {r.thresholds.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-faint">
              <span className="font-semibold text-navy uppercase tracking-wider text-[10px]">Decision Impact:</span>
              <span>{r.impact}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
