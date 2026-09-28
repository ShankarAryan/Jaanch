import { PrismaClient } from '@prisma/client';
import { companyBySlug, companyGstin } from '../src/lib/fixtures/syntheticCompanies';

const prisma = new PrismaClient();

// --- Requirement builders --------------------------------------------------
// Same derivation as the flagship tender: GST + PAN + blacklist are always
// mandatory gates; OEM Authorization is mandatory wherever the bid lists it
// as a required seller document; Udyam and Make-in-India are configured per
// the bid's real MSE / MII position.

const gstReq = {
  code: 'GST_FILING',
  label: 'GST Registration & Return Filing',
  sourceType: 'gst',
  mandatory: true,
  ruleConfig: JSON.stringify({ maxFilingDelayMonths: 2, basis: 'GeM seller-registration requirement.' }),
};
const panReq = {
  code: 'PAN_IT_COMPLIANCE',
  label: 'PAN Validity',
  sourceType: 'pan',
  mandatory: true,
  ruleConfig: JSON.stringify({ basis: 'GeM seller-registration requirement.' }),
};
const blacklistReq = {
  code: 'BLACKLIST_CHECK',
  label: 'Blacklisting / Debarment Check',
  sourceType: 'blacklist',
  mandatory: true,
  ruleConfig: JSON.stringify({ basis: 'Standard eligibility gate (CVC / ministry debarment lists).' }),
};
const oemReq = {
  code: 'OEM_AUTHORIZATION',
  label: 'OEM Authorization Certificate',
  sourceType: 'oemAuthorization',
  mandatory: true,
  ruleConfig: JSON.stringify({ basis: 'Listed as a required seller document for this bid.' }),
};
const epfoReq = {
  code: 'EPFO_ESIC_COMPLIANCE',
  label: 'EPFO / ESIC & Labour Code Compliance (where applicable)',
  sourceType: 'epfoEsic',
  mandatory: false,
  ruleConfig: JSON.stringify({ basis: 'GeM GTC: compliance with the four Labour Codes / pre-existing labour laws.' }),
};
const digilockerReq = {
  code: 'DOCUMENT_VERIFICATION',
  label: 'DigiLocker Document Verification',
  sourceType: 'digilocker',
  mandatory: false,
  ruleConfig: JSON.stringify({}),
};

const udyamMse = (pct: number, cap: number) => ({
  code: 'UDYAM_STATUS',
  label: 'Udyam / MSME Registration (purchase preference & relaxations)',
  sourceType: 'udyam',
  mandatory: false,
  ruleConfig: JSON.stringify({
    msePreferencePercent: pct,
    mseQuantityCapPercent: cap,
    basis: `This tender: MSE Purchase Preference = Yes (L1+${pct}%, up to ${cap}% of quantity). Not a disqualification criterion.`,
  }),
});
const udyamNoMse = {
  code: 'UDYAM_STATUS',
  label: 'Udyam / MSME Registration',
  sourceType: 'udyam',
  mandatory: false,
  ruleConfig: JSON.stringify({
    basis: 'MSE Purchase Preference is not offered for this tender. Udyam status is informational only here.',
  }),
};

const miiApplicable = (pct: number, cap: number, extra: string) => ({
  code: 'MAKE_IN_INDIA_LOCAL_CONTENT',
  label: 'Make in India — Local Content',
  sourceType: 'makeInIndia',
  mandatory: false,
  ruleConfig: JSON.stringify({
    minLocalContentPercent: 50,
    tolerancePercent: 5,
    miiPreferencePercent: pct,
    miiQuantityCapPercent: cap,
    basis: `MII Purchase Preference = Yes (up to L1+${pct}%, ${cap}% of quantity). ${extra}`,
  }),
});
const miiWaived = (waiverBasis: string) => ({
  code: 'MAKE_IN_INDIA_LOCAL_CONTENT',
  label: 'Make in India — Local Content',
  sourceType: 'makeInIndia',
  mandatory: false,
  ruleConfig: JSON.stringify({ notApplicable: true, waiverBasis, minLocalContentPercent: 50, tolerancePercent: 5 }),
});

// --- Bidder builders -----------------------------------------------------

interface SeedBidder {
  key: string;
  /**
   * Stable per-company identity, shared by every row for the same company
   * across tenders (e.g. 'sentinel-imaging' on tenders 5/8/9). This is what a
   * Bidder signs in as; `key` stays per-row for fixture joins.
   */
  companySlug: string;
  name: string;
  udyamNumber: string | null;
  gstin: string | null;
  pan: string;
  claimedTurnoverInrLakh: number;
  claimedEmployeeCount: number;
  certificateText: string | null;
}

/** A bidder drawn from the synthetic-company pool, with a per-tender key. */
function poolBidder(
  slug: string,
  tag: string,
  opts: { turnover?: number; employees?: number; cert?: string } = {},
): SeedBidder {
  const c = companyBySlug.get(slug);
  if (!c) throw new Error(`unknown synthetic company: ${slug}`);
  return {
    key: `${slug}-${tag}`,
    companySlug: slug,
    name: c.name,
    udyamNumber: c.udyamNumber,
    gstin: companyGstin(c),
    pan: c.pan,
    claimedTurnoverInrLakh: opts.turnover ?? 260,
    claimedEmployeeCount: opts.employees ?? 44,
    certificateText: opts.cert ?? null,
  };
}

// --- The 10 real GeM tenders -------------------------------------------------
// Every referenceNo / title / organisation / bid date / EMD / MSE / MII field
// below is taken verbatim from the published bid document and is
// independently verifiable on the GeM portal. Bidders are synthetic.

interface SeedTender {
  referenceNo: string;
  title: string;
  organization: string;
  department: string;
  category: string;
  // The bid document's "Dated" field (issue date), taken verbatim from each
  // source PDF. Not a submission-window start — GeM's window opens at the
  // bid-publish moment and closes at bidEndsAt.
  documentDated: Date;
  bidEndsAt: Date;
  emdRequired: boolean;
  emdNote: string | null;
  miiNote: string;
  mseNote: string;
  requirements: Array<{ code: string; label: string; sourceType: string; mandatory: boolean; ruleConfig: string }>;
  bidders: SeedBidder[];
}

const TENDERS: SeedTender[] = [
  // ============ TENDER 1 — flagship (kept verbatim) ============
  {
    referenceNo: 'GEM/2026/B/7983771',
    title: 'Cyber Forensic Hardware and Software',
    organization: 'Centre for Development of Advanced Computing (C-DAC), Thiruvananthapuram',
    department: 'Ministry of Electronics & IT — Department of Electronics and Information Technology',
    category: 'Global Tender — GlobalTenderCategory (Q3)',
    documentDated: new Date('2026-09-03T00:00:00+05:30'),
    bidEndsAt: new Date('2026-09-08T17:00:00+05:30'),
    emdRequired: false,
    emdNote: 'Not required. ePBG 5% of contract value, valid 14 months (State Bank of India).',
    miiNote:
      'Make in India Purchase Preference: NOT opted. Competent Authority (Dr. Parameswaran Nampoothiri V, Section Head Purchase, C-DAC) approved a Global Tender on 01-09-2026 — the tendered items are not available domestically. CA Approval CDAC/CFSPR291/16714.',
    mseNote:
      'MSE Purchase Preference: Yes — MSE OEMs / Service Providers get preference up to price within L1+15%, for up to 25% of bid quantity. Startups (DPIIT-registered) are relaxed from the experience criteria.',
    requirements: [
      {
        code: 'GST_FILING',
        label: 'GST Registration & Return Filing',
        sourceType: 'gst',
        mandatory: true,
        ruleConfig: JSON.stringify({
          maxFilingDelayMonths: 2,
          basis: 'GeM seller-registration requirement; financial-document verification is required for this bid.',
        }),
      },
      { code: 'PAN_IT_COMPLIANCE', label: 'PAN Validity', sourceType: 'pan', mandatory: true, ruleConfig: JSON.stringify({ basis: 'GeM seller-registration requirement.' }) },
      {
        code: 'BLACKLIST_CHECK',
        label: 'Blacklisting / Debarment Check',
        sourceType: 'blacklist',
        mandatory: true,
        ruleConfig: JSON.stringify({ basis: 'Standard eligibility gate (CVC / ministry debarment lists).' }),
      },
      {
        code: 'OEM_AUTHORIZATION',
        label: 'OEM Authorization Certificate',
        sourceType: 'oemAuthorization',
        mandatory: true,
        ruleConfig: JSON.stringify({ basis: 'Listed under "Document required from seller" for this bid.' }),
      },
      {
        code: 'UDYAM_STATUS',
        label: 'Udyam / MSME Registration (purchase preference & relaxations)',
        sourceType: 'udyam',
        mandatory: false,
        ruleConfig: JSON.stringify({
          msePreferencePercent: 15,
          mseQuantityCapPercent: 25,
          confers: ['MSE purchase preference (L1+15%, up to 25% of quantity)', 'Experience-criteria relaxation (MSE / DPIIT Startup)'],
          basis: 'This tender: MSE Purchase Preference = Yes. Not a disqualification criterion.',
        }),
      },
      {
        code: 'MAKE_IN_INDIA_LOCAL_CONTENT',
        label: 'Make in India — Local Content',
        sourceType: 'makeInIndia',
        mandatory: false,
        ruleConfig: JSON.stringify({
          notApplicable: true,
          waiverBasis:
            'Not applicable to this tender. MII Purchase Preference = No; Competent Authority approved a Global Tender on the ground that the tendered items are not available domestically (CA Approval CDAC/CFSPR291/16714, 01-09-2026).',
          minLocalContentPercent: 50,
          tolerancePercent: 5,
        }),
      },
      {
        code: 'EPFO_ESIC_COMPLIANCE',
        label: 'EPFO / ESIC & Labour Code Compliance (where applicable)',
        sourceType: 'epfoEsic',
        mandatory: false,
        ruleConfig: JSON.stringify({
          basis: 'GeM GTC: compliance with the four Labour Codes (Wages 2019; IR 2020; OSH 2020; Social Security 2020) / pre-existing labour laws.',
        }),
      },
      { code: 'DOCUMENT_VERIFICATION', label: 'DigiLocker Document Verification', sourceType: 'digilocker', mandatory: false, ruleConfig: JSON.stringify({}) },
    ],
    // Bidders are populated live via /admin/import + the Documents upload UI,
    // not seeded. Re-seeding leaves 10 correctly-configured tenders, no bidders.
    bidders: [],
  },

  // ============ TENDER 2 ============
  {
    referenceNo: 'GEM/2026/B/7829782',
    title: 'High Repetition Rate Pulsed Laser Source',
    organization: 'Office of DG (ECS), CHESS Vignyanakancha, Hyderabad',
    department: 'Ministry of Defence — Department of Defence R&D (DRDO)',
    category: 'Defence R&D Equipment — Global Tender (Q3)',
    documentDated: new Date('2026-08-13T00:00:00+05:30'),
    bidEndsAt: new Date('2026-09-03T09:00:00+05:30'),
    emdRequired: true,
    emdNote: 'Required · INR 8,58,163 (also USD 8,977 / JPY 14,37,771 / EUR 7,790), State Bank of India. ePBG 5% / 6 months.',
    miiNote:
      'Make in India Purchase Preference: NOT opted. Competent Authority (D S Negi, Joint Director DFMM, CHESS Hyderabad) approved a Global Tender Enquiry on 11-03-2026 under Rule 161(iv)(b) of GFR-2017 (CA Approval #01).',
    mseNote: 'MSE Purchase Preference: No. MSE / Startup relaxation on experience and turnover: No.',
    requirements: [
      gstReq,
      panReq,
      blacklistReq,
      oemReq,
      udyamNoMse,
      miiWaived(
        'Not applicable to this tender. MII Purchase Preference = No; Competent Authority (D S Negi, Joint Director DFMM) approved a Global Tender Enquiry on 11-03-2026 under Rule 161(iv)(b) of GFR-2017 (CA Approval #01).',
      ),
      epfoReq,
      digilockerReq,
    ],
    bidders: [], // populated live via /admin/import + Documents upload, not seeded
  },

  // ============ TENDER 3 ============
  {
    referenceNo: 'GEM/2026/B/7801588',
    title: '3D intraoral scanner with software and accessories',
    organization: 'All India Institute of Medical Sciences (AIIMS), Bibinagar',
    department: 'Ministry of Health & Family Welfare — Department of Health & Family Welfare',
    category: 'Medical Equipment',
    documentDated: new Date('2026-08-06T00:00:00+05:30'),
    bidEndsAt: new Date('2026-08-28T15:00:00+05:30'),
    emdRequired: true,
    emdNote: 'Required · INR 85,000 (Bank of Baroda). ePBG 5% / 26 months.',
    miiNote: 'Make in India Purchase Preference: Yes — up to L1+20%, for up to 50% of bid quantity.',
    mseNote:
      'MSE Purchase Preference: Yes — up to L1+15%, for up to 25% of bid quantity. MSE / Startup relaxation on Experience AND Turnover criteria: Yes (Complete).',
    requirements: [
      gstReq,
      panReq,
      blacklistReq,
      oemReq,
      udyamMse(15, 25),
      miiApplicable(20, 50, 'MII Purchase Preference: Yes.'),
      epfoReq,
      digilockerReq,
    ],
    bidders: [], // populated live via /admin/import + Documents upload, not seeded
  },

  // ============ TENDER 4 ============
  {
    referenceNo: 'GEM/2026/B/7815102',
    title: 'Microwave Plasma Asher',
    organization: 'Solid State Physics Laboratory (SSPL), Delhi',
    department: 'Ministry of Defence — Department of Defence R&D (DRDO)',
    category: 'Defence R&D Equipment — Global Tender (Q3)',
    documentDated: new Date('2026-07-27T00:00:00+05:30'),
    bidEndsAt: new Date('2026-08-24T13:00:00+05:30'),
    emdRequired: true,
    emdNote:
      'Required · INR 15,00,000 (also USD / JPY / EUR), State Bank of India. ePBG 5% / 14 months. Third-party DRDO post-dispatch inspection required.',
    miiNote:
      'Make in India Purchase Preference: NOT opted. Competent Authority (Joint Director DFMM) approved a Global Tender Enquiry on 15-07-2026 under Rule 161(iv)(b) of GFR-2017. Approval ref DRDO/DFMM/MM/GTE/SSPL/2025-26/075.',
    mseNote: 'MSE Purchase Preference: No.',
    requirements: [
      gstReq,
      panReq,
      blacklistReq,
      oemReq,
      udyamNoMse,
      miiWaived(
        'Not applicable to this tender. MII Purchase Preference = No; Competent Authority (Joint Director DFMM) approved a Global Tender Enquiry on 15-07-2026 under Rule 161(iv)(b) of GFR-2017 (approval ref DRDO/DFMM/MM/GTE/SSPL/2025-26/075).',
      ),
      epfoReq,
      digilockerReq,
    ],
    bidders: [], // populated live via /admin/import + Documents upload, not seeded
  },

  // ============ TENDER 5 ============
  {
    referenceNo: 'GEM/2026/B/7827388',
    title: 'GC Mass Spectrometer',
    organization: 'ICAR — Indian Agricultural Research Institute (IARI), New Delhi',
    department: 'Ministry of Agriculture & Farmers Welfare — Department of Agricultural Research & Education (DARE)',
    category: 'Scientific / Laboratory Instruments',
    documentDated: new Date('2026-08-19T00:00:00+05:30'),
    bidEndsAt: new Date('2026-09-02T16:00:00+05:30'),
    emdRequired: true,
    emdNote: 'Required · INR 1,50,000 (State Bank of India). ePBG 5% / 26 months. Past-performance requirement: 50%.',
    miiNote:
      'Make in India Purchase Preference: Yes — up to L1+20%, for up to 50% of bid quantity. This tender takes NO exemption from the Class-1 / Class-2 local-supplier restriction.',
    mseNote:
      'MSE Purchase Preference: Yes — up to L1+15%, for up to 25% of bid quantity. MSE / Startup relaxation on Experience AND Turnover: Yes (Complete).',
    requirements: [
      gstReq,
      panReq,
      blacklistReq,
      oemReq,
      udyamMse(15, 25),
      miiApplicable(20, 50, 'No exemption taken from the Class-1 / Class-2 local-supplier restriction.'),
      epfoReq,
      digilockerReq,
    ],
    bidders: [], // populated live via /admin/import + Documents upload, not seeded
  },

  // ============ TENDER 6 ============
  {
    referenceNo: 'GEM/2026/B/7914955',
    title: 'High end ICU Ventilators',
    organization: 'All India Institute of Medical Sciences (AIIMS), Raipur',
    department: 'Ministry of Health & Family Welfare',
    category: 'Medical Equipment (Critical Care)',
    documentDated: new Date('2026-08-18T00:00:00+05:30'),
    bidEndsAt: new Date('2026-09-15T15:00:00+05:30'),
    emdRequired: true,
    emdNote: 'Required · INR 6,38,880 (Bank of India). ePBG 5% / 27 months. Past-performance requirement: 50%.',
    miiNote:
      'Make in India Purchase Preference: Yes — up to L1+20%, for up to 50% of bid quantity, WITH an exemption from the Class-1 / Class-2 local-supplier restriction per Dept of Expenditure OM dated 28-05-2020.',
    mseNote:
      'MSE Purchase Preference: Yes — up to L1+15%, for up to 25% of bid quantity. MSE / Startup relaxation on Experience AND Turnover: Yes (Complete).',
    requirements: [
      gstReq,
      panReq,
      blacklistReq,
      oemReq,
      udyamMse(15, 25),
      miiApplicable(20, 50, 'Exemption from the Class-1 / Class-2 local-supplier restriction per Dept of Expenditure OM 28-05-2020.'),
      epfoReq,
      digilockerReq,
    ],
    bidders: [], // populated live via /admin/import + Documents upload, not seeded
  },

  // ============ TENDER 7 ============
  {
    referenceNo: 'GEM/2026/B/7917062',
    title: 'Laser beam diameter and power distribution measurement system',
    organization: 'Office of DG (ECS), CHESS Vignyanakancha, Hyderabad',
    department: 'Ministry of Defence — Department of Defence R&D (DRDO)',
    category: 'Defence R&D — Optics / Metrology — Global Tender (Q3)',
    documentDated: new Date('2026-08-17T00:00:00+05:30'),
    bidEndsAt: new Date('2026-09-07T09:00:00+05:30'),
    emdRequired: true,
    emdNote: 'Required · INR 2,13,356 (also USD / JPY / EUR), State Bank of India. ePBG 5% / 5 months.',
    miiNote:
      'Make in India Purchase Preference: NOT opted. Competent Authority (D S Negi, Joint Director DFMM, CHESS Hyderabad) approved a Global Tender Enquiry on 27-01-2026 under Rule 161(iv)(b) of GFR-2017 (CA Approval #01).',
    mseNote: 'MSE Purchase Preference: No.',
    requirements: [
      gstReq,
      panReq,
      blacklistReq,
      oemReq,
      udyamNoMse,
      miiWaived(
        'Not applicable to this tender. MII Purchase Preference = No; Competent Authority (D S Negi, Joint Director DFMM) approved a Global Tender Enquiry on 27-01-2026 under Rule 161(iv)(b) of GFR-2017 (CA Approval #01).',
      ),
      epfoReq,
      digilockerReq,
    ],
    bidders: [], // populated live via /admin/import + Documents upload, not seeded
  },

  // ============ TENDER 8 ============
  {
    referenceNo: 'GEM/2026/B/7931202',
    title: '300 mA X-ray machine with DR system',
    organization: 'Municipal Corporation of Greater Mumbai (MCGM), Zone 1',
    department: 'Government of Maharashtra — Urban Local Body',
    category: 'Municipal Healthcare Equipment',
    documentDated: new Date('2026-08-24T00:00:00+05:30'),
    bidEndsAt: new Date('2026-09-03T12:00:00+05:30'),
    emdRequired: false,
    emdNote: 'Not required. ePBG: Not required. Bid offer validity: 30 days (unusually short). Past-performance requirement: 10%.',
    miiNote: 'Make in India Purchase Preference: No. No competent-authority waiver document was cited in the bid.',
    mseNote: 'MSE Purchase Preference: No.',
    requirements: [
      gstReq,
      panReq,
      blacklistReq,
      oemReq,
      udyamNoMse,
      miiWaived(
        'Not applicable to this tender. MII Purchase Preference = No for this tender — no local-content preference is offered, so no Local Content Certificate is required. (Unlike tenders 1/2/4, this is not a Competent Authority waiver of an otherwise-applicable requirement; MII preference was simply not invoked.)',
      ),
      epfoReq,
      digilockerReq,
    ],
    bidders: [], // populated live via /admin/import + Documents upload, not seeded
  },

  // ============ TENDER 9 ============
  {
    referenceNo: 'GEM/2026/B/7946979',
    title: 'Retrofit Digital Radiography System',
    organization: 'Municipal Corporation of Greater Mumbai (MCGM), Zone 1',
    department: 'Government of Maharashtra — Urban Local Body',
    category: 'Municipal Healthcare Equipment',
    documentDated: new Date('2026-09-01T00:00:00+05:30'),
    bidEndsAt: new Date('2026-09-11T16:00:00+05:30'),
    emdRequired: false,
    emdNote: 'Not required. Past-performance requirement: 10%.',
    miiNote: 'Make in India Purchase Preference: No. No competent-authority waiver document was cited in the bid.',
    mseNote: 'MSE Purchase Preference: No.',
    requirements: [
      gstReq,
      panReq,
      blacklistReq,
      oemReq,
      udyamNoMse,
      miiWaived(
        'Not applicable to this tender. MII Purchase Preference = No for this tender — no local-content preference is offered, so no Local Content Certificate is required. (Unlike tenders 1/2/4, this is not a Competent Authority waiver of an otherwise-applicable requirement; MII preference was simply not invoked.)',
      ),
      epfoReq,
      digilockerReq,
    ],
    bidders: [], // populated live via /admin/import + Documents upload, not seeded
  },

  // ============ TENDER 10 ============
  {
    referenceNo: 'GEM/2026/B/7922011',
    title: 'Cavitron Ultrasonic Surgical Aspirator',
    organization: 'North Eastern Indira Gandhi Regional Institute of Health & Medical Sciences (NEIGRIHMS), Shillong',
    department: 'Ministry of Health & Family Welfare',
    category: 'Medical Equipment',
    documentDated: new Date('2026-08-17T00:00:00+05:30'),
    bidEndsAt: new Date('2026-09-14T14:00:00+05:30'),
    emdRequired: true,
    emdNote:
      'Required · INR 1,50,000 + USD 1,765 (Bank of Baroda). ePBG 3% / 26 months. Past-performance requirement: 30%. Estimated bid value: INR 75,00,000.',
    miiNote:
      'Make in India Purchase Preference: Yes — up to L1+20%, for up to 50% of bid quantity. This tender takes NO exemption from the Class-1 / Class-2 local-supplier restriction.',
    mseNote:
      'MSE Purchase Preference: Yes — up to L1+15%, for up to 25% of bid quantity. MSE relaxation with a partial turnover relaxation (turnover value INR 17 lakh).',
    requirements: [
      gstReq,
      panReq,
      blacklistReq,
      oemReq,
      udyamMse(15, 25),
      miiApplicable(20, 50, 'No exemption taken from the Class-1 / Class-2 local-supplier restriction.'),
      epfoReq,
      digilockerReq,
    ],
    bidders: [], // populated live via /admin/import + Documents upload, not seeded
  },
];

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.score.deleteMany();
  await prisma.verificationResult.deleteMany();
  await prisma.document.deleteMany();
  await prisma.bidder.deleteMany();
  await prisma.complianceRequirement.deleteMany();
  await prisma.tender.deleteMany();
  await prisma.importBatch.deleteMany(); // Tender FKs to ImportBatch, so after tenders

  // (Re-seeding gives the demo a clean baseline: 10 originally-seeded tenders,
  //  no import batches. Dataset imports happen via /admin/import afterwards.)

  let bidderCount = 0;
  for (const t of TENDERS) {
    const tender = await prisma.tender.create({
      data: {
        referenceNo: t.referenceNo,
        title: t.title,
        organization: t.organization,
        department: t.department,
        category: t.category,
        documentDated: t.documentDated,
        bidEndsAt: t.bidEndsAt,
        emdRequired: t.emdRequired,
        emdNote: t.emdNote,
        miiNote: t.miiNote,
        mseNote: t.mseNote,
        requirements: { create: t.requirements },
      },
    });

    for (const b of t.bidders) {
      await prisma.bidder.create({
        data: {
          tenderId: tender.id,
          key: b.key,
          companySlug: b.companySlug,
          name: b.name,
          udyamNumber: b.udyamNumber,
          gstin: b.gstin,
          pan: b.pan,
          claimedTurnoverInrLakh: b.claimedTurnoverInrLakh,
          claimedEmployeeCount: b.claimedEmployeeCount,
          documents: b.certificateText
            ? { create: [{ docType: 'LOCAL_CONTENT_CERTIFICATE', fileName: `${b.key}-local-content-certificate.pdf`, rawText: b.certificateText }] }
            : undefined,
        },
      });
      bidderCount++;
    }
  }

  console.log(`Seeded ${TENDERS.length} real GeM tenders with ${bidderCount} synthetic bidders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
