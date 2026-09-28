import { gstinCheckChar } from '@/lib/validation/gstin';

/**
 * A small pool of synthetic companies that bid across tenders 2-10. Each
 * one is deliberately shaped to exercise a particular verification outcome
 * (clean pass, a real GSTIN-checksum failure, a malformed PAN, blacklisted,
 * unregistered, a filing delay, ...). Because the GST / PAN / Udyam fixture
 * tables are keyed by identifier - not by bidder - one company definition
 * here serves every tender it bids on.
 *
 * The identifiers are synthetic. GSTINs are computed with the real Mod-36
 * checksum so a "clean" company genuinely passes `validateGstin`.
 */

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export interface SyntheticCompany {
  slug: string;
  name: string;
  pan: string; // may be deliberately malformed
  gstStateCode: string; // 2-digit GST state code, used to build the GSTIN
  gstinNull?: boolean; // company did not supply a GSTIN
  breakGstinChecksum?: boolean; // GSTIN's 15th char is wrong -> real check fails
  udyamNumber: string | null;
  udyamCategory: 'Micro' | 'Small' | 'Medium';
  /** Has entries in the simulated GST / PAN / Udyam registries. */
  registered: boolean;
  gstFilingDelayMonths?: number;
  itFilingStatus?: 'Filed' | 'NotFiled';
  blacklisted?: boolean;
  blacklistReason?: string;
}

function computeGstin(stateCode: string, pan: string, broken = false): string {
  const first14 = `${stateCode}${pan}1Z`;
  const check = gstinCheckChar(first14);
  if (!broken) return first14 + check;
  const wrong = ALPHABET[(ALPHABET.indexOf(check) + 1) % 36];
  return first14 + wrong;
}

export function companyGstin(c: SyntheticCompany): string | null {
  if (c.gstinNull) return null;
  return computeGstin(c.gstStateCode, c.pan, c.breakGstinChecksum);
}

export const SYNTHETIC_COMPANIES: SyntheticCompany[] = [
  // --- Clean companies (full fixture coverage -> can pass) ---
  {
    slug: 'nucleus-scientific',
    name: 'Nucleus Scientific Instruments Pvt Ltd',
    pan: 'AABCN7391K',
    gstStateCode: '29', // Karnataka
    udyamNumber: 'UDYAM-KR-03-0044821',
    udyamCategory: 'Small',
    registered: true,
  },
  {
    slug: 'apex-medtech',
    name: 'Apex Medtech Systems Pvt Ltd',
    pan: 'AAJCA5527M',
    gstStateCode: '36', // Telangana
    udyamNumber: 'UDYAM-TS-11-0071204',
    udyamCategory: 'Medium',
    registered: true,
  },
  {
    slug: 'bluewave-defence',
    name: 'Bluewave Defence Technologies Pvt Ltd',
    pan: 'AAGCB1188Q',
    gstStateCode: '07', // Delhi
    udyamNumber: 'UDYAM-DL-05-0009337',
    udyamCategory: 'Small',
    registered: true,
  },
  {
    slug: 'coromandel-diagnostics',
    name: 'Coromandel Diagnostics Pvt Ltd',
    pan: 'AADCC9042J',
    gstStateCode: '33', // Tamil Nadu
    udyamNumber: 'UDYAM-TN-04-0061590',
    udyamCategory: 'Micro',
    registered: true,
  },
  {
    slug: 'himalaya-precision',
    name: 'Himalaya Precision Labs LLP',
    pan: 'AAEFH3310P',
    gstStateCode: '27', // Maharashtra
    udyamNumber: 'UDYAM-MH-18-0033471',
    udyamCategory: 'Small',
    registered: true,
  },
  {
    slug: 'sentinel-imaging',
    name: 'Sentinel Imaging Solutions Pvt Ltd',
    pan: 'AAHCS6621L',
    gstStateCode: '19', // West Bengal
    udyamNumber: 'UDYAM-WB-07-0052806',
    udyamCategory: 'Medium',
    registered: true,
  },

  // --- Problem companies ---
  {
    // valid PAN, in the PAN registry - but its GSTIN's Mod-36 checksum is wrong
    slug: 'rapid-procure',
    name: 'Rapid Procurement Traders',
    pan: 'AAFCR2204H',
    gstStateCode: '09', // Uttar Pradesh
    breakGstinChecksum: true,
    udyamNumber: null,
    udyamCategory: 'Small',
    registered: true, // pan registry entry; GSTIN never reaches the gst registry
  },
  {
    // PAN has a letter 'O' where a digit belongs -> real format check rejects it
    slug: 'meridian-instruments',
    name: 'Meridian Instruments LLP',
    pan: 'AAEFM55O2R',
    gstStateCode: '27',
    gstinNull: true,
    udyamNumber: null,
    udyamCategory: 'Small',
    registered: false,
  },
  {
    // valid, registered - but on a ministry debarment list
    slug: 'zenith-supplies',
    name: 'Zenith Supplies & Co',
    pan: 'AABFZ1177K',
    gstStateCode: '24', // Gujarat
    udyamNumber: null,
    udyamCategory: 'Small',
    registered: true,
    blacklisted: true,
    blacklistReason: 'Debarred by a procuring ministry for supply of non-conforming goods (2025)',
  },
  {
    // valid identifiers, not found in any simulated registry -> NEEDS REVIEW
    slug: 'orbit-traders',
    name: 'Orbit Traders Pvt Ltd',
    pan: 'AACCO8830D',
    gstStateCode: '33',
    udyamNumber: null,
    udyamCategory: 'Small',
    registered: false,
  },
  {
    slug: 'polaris-medequip',
    name: 'Polaris Medequip Pvt Ltd',
    pan: 'AABCP2255K',
    gstStateCode: '29',
    udyamNumber: null,
    udyamCategory: 'Small',
    registered: false,
  },
  {
    // registered, but GST returns are behind the tender's filing-delay limit
    slug: 'crest-labtech',
    name: 'Crest Labtech Pvt Ltd',
    pan: 'AAGCC4512F',
    gstStateCode: '06', // Haryana
    udyamNumber: null,
    udyamCategory: 'Small',
    registered: true,
    gstFilingDelayMonths: 4,
  },
  {
    // registered, GST current - but the latest income-tax return is unfiled
    slug: 'delta-scientific',
    name: 'Delta Scientific Corp',
    pan: 'AAJCD7719M',
    gstStateCode: '21', // Odisha
    udyamNumber: null,
    udyamCategory: 'Small',
    registered: true,
    itFilingStatus: 'NotFiled',
  },
];

export const companyBySlug = new Map(SYNTHETIC_COMPANIES.map((c) => [c.slug, c]));
