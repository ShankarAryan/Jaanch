/* ============================================================================
 * ⚠️  STALE — HISTORICAL VALUES ONLY. DO NOT RESEED FROM THIS FILE. ⚠️
 *
 * As of the registry migration (commit 4f207fe) the live simulated registries
 * are the RegistryPan / RegistryGst / RegistryUdyam / RegistryBlacklist /
 * RegistryDpiitLocalContent tables in Supabase Postgres — NOT this file, and
 * NOT scripts/seedRegistries.ts.
 *
 * Those live tables were then MANUALLY CORRECTED directly in Supabase so that
 * all 37 demo bidders verify cleanly (registered PAN/GST/Udyam rows for every
 * declared identity, blacklist emptied, DPIIT rows matched to declared local
 * content). The objects below still hold the ORIGINAL demo-failure values —
 * unregistered bidders, broken GSTIN checksums, filing delays, blacklist
 * entries, etc.
 *
 * Running `npx tsx scripts/seedRegistries.ts` again would SILENTLY OVERWRITE
 * the corrected live data back to these stale values. Don't.
 *
 * This file is kept only because other code imports the TypeScript *types*
 * (UdyamRecord / GstRecord / PanRecord / BlacklistRecord /
 * DpiitLocalContentRecord). It is no longer the source of truth for any data.
 * ============================================================================ */

/**
 * Simulated government registries.
 *
 * Real production access to Udyam / GSTN / PAN / DPIIT requires GSP or
 * partner-API credentials that no student team can obtain during a
 * hackathon (see SIH26100_Problem_Analysis.md, Section 3). Rather than
 * hit fake or scraped endpoints - which is what broke the previous
 * build - the simulated part of each check reads from ONE of these
 * fixture tables, which stand in for "what the real registry would say."
 *
 * NOTE: the PAN and GST providers no longer rely on a fixture *lookup* for
 * the identifier itself - they run the real government-specified checks
 * (PAN format + holder type; GSTIN Mod-36 checksum + embedded-PAN match) in
 * src/lib/validation/*. These tables only supply the still-simulated
 * registration/filing layer that sits on top.
 *
 * This file is imported by both the providers (src/lib/providers/mock/*)
 * and prisma/seed.ts, so the bidder rows created in the demo always line up
 * with the fixture data the providers will check them against.
 *
 * The hand-written entries below cover the flagship tender's five bidders.
 * Entries for the synthetic-company pool that bids across tenders 2-10 are
 * appended at the bottom from src/lib/fixtures/syntheticCompanies.ts.
 */

import { SYNTHETIC_COMPANIES, companyGstin } from './syntheticCompanies';

export interface UdyamRecord {
  enterpriseName: string;
  category: 'Micro' | 'Small' | 'Medium';
  status: 'Active' | 'Cancelled';
  registeredOn: string; // ISO date
}

export interface GstRecord {
  legalName: string;
  status: 'Active' | 'Cancelled' | 'Suspended';
  lastReturnPeriod: string; // e.g. "2026-07"
  returnFilingDelayMonths: number;
}

export interface PanRecord {
  holderName: string;
  panStatus: 'Valid' | 'Invalid' | 'Deactivated';
  itFilingStatus: 'Filed' | 'NotFiled';
}

export interface BlacklistRecord {
  matchValue: string; // pan, gstin, or name fragment
  matchField: 'pan' | 'gstin' | 'name';
  reason: string;
  debarredUntil: string; // ISO date
}

export interface DpiitLocalContentRecord {
  verifiedLocalContentPercent: number;
  certifyingAgency: string;
}

export const udyamRegistry: Record<string, UdyamRecord> = {
  'UDYAM-TN-03-0012345': {
    enterpriseName: 'Chennai Precision Engineering Pvt Ltd',
    category: 'Small',
    status: 'Active',
    registeredOn: '2021-04-11',
  },
  'UDYAM-TN-06-0098765': {
    enterpriseName: 'Bharath MSME Fabricators',
    category: 'Micro',
    status: 'Active',
    registeredOn: '2022-01-19',
  },
  // NovaTech deliberately has NO Udyam entry - simulates a bidder who
  // claimed an Udyam number that does not exist in the registry.
};

// Keyed by GSTIN. All keys here carry a valid Mod-36 checksum (the real
// check runs first). Swift's GSTIN deliberately has a broken checksum, so it
// never reaches this table - the real validator rejects it.
export const gstRegistry: Record<string, GstRecord> = {
  '33AAACC1206D1ZN': {
    legalName: 'Chennai Precision Engineering Pvt Ltd',
    status: 'Active',
    lastReturnPeriod: '2026-08',
    returnFilingDelayMonths: 0,
  },
  '33AACFC5678K1Z8': {
    legalName: 'Coastal Traders & Co',
    status: 'Active',
    lastReturnPeriod: '2026-03',
    returnFilingDelayMonths: 5,
  },
  '29AAGFB0987R1ZM': {
    legalName: 'Bharath MSME Fabricators',
    status: 'Active',
    lastReturnPeriod: '2026-08',
    returnFilingDelayMonths: 0,
  },
};

// Keyed by PAN. NovaTech's seeded PAN is structurally malformed (letter O
// where a digit belongs), so the real format check rejects it before this
// lookup - it has no entry here.
export const panRegistry: Record<string, PanRecord> = {
  AAACC1206D: { holderName: 'Chennai Precision Engineering Pvt Ltd', panStatus: 'Valid', itFilingStatus: 'Filed' },
  AACFC5678K: { holderName: 'Coastal Traders & Co', panStatus: 'Valid', itFilingStatus: 'Filed' },
  AAGFB0987R: { holderName: 'Bharath MSME Fabricators', panStatus: 'Valid', itFilingStatus: 'Filed' },
  AABCS4321L: { holderName: 'Swift Supplies Enterprises', panStatus: 'Valid', itFilingStatus: 'NotFiled' },
};

export const blacklistRegistry: BlacklistRecord[] = [
  {
    matchValue: 'AABCS4321L',
    matchField: 'pan',
    reason: 'Debarred by CVC for contract non-performance (2025)',
    debarredUntil: '2027-06-30',
  },
];

// Keyed by Bidder.key for the originally-seeded rows, and ALSO by the
// compound key `${companySlug}@${tender.referenceNo}` - see the note below.
// There's no single natural government ID for a Make-in-India local-content
// declaration, so this stands in for the DPIIT/Make in India portal's
// cross-check of the bidder's declared %.
export const dpiitLocalContentRegistry: Record<string, DpiitLocalContentRecord> = {
  'chennai-precision-engineering': { verifiedLocalContentPercent: 62, certifyingAgency: 'DPIIT Registered CA - S. Ramanathan & Co' },
  'coastal-traders': { verifiedLocalContentPercent: 38, certifyingAgency: 'DPIIT Registered CA - Iyer & Associates' },
  'bharath-msme-fabricators': { verifiedLocalContentPercent: 55, certifyingAgency: 'DPIIT Registered CA - K. Suresh & Co' },
  'swift-supplies-enterprises': { verifiedLocalContentPercent: 20, certifyingAgency: 'DPIIT Registered CA - Iyer & Associates' },
  // NovaTech has no DPIIT cross-check record on file.

  // Cert-carrying bidders on tenders 3, 5, 6, 10 (keyed by their per-tender Bidder.key).
  'coromandel-diagnostics-t3': { verifiedLocalContentPercent: 63, certifyingAgency: 'DPIIT Registered CA - Rao & Narayan' },
  'nucleus-scientific-t5': { verifiedLocalContentPercent: 70, certifyingAgency: 'DPIIT Registered CA - Rao & Narayan' },
  'apex-medtech-t6': { verifiedLocalContentPercent: 55, certifyingAgency: 'DPIIT Registered CA - Iyer & Associates' },
  'coromandel-diagnostics-t10': { verifiedLocalContentPercent: 66, certifyingAgency: 'DPIIT Registered CA - Rao & Narayan' },

  // Compound keys, `${companySlug}@${tender.referenceNo}` - what a provider
  // should actually look up with (see makeInIndia.ts). Bidder.key carries a
  // random suffix for any bidder created through /admin/import
  // (src/lib/import/commit.ts), so the t-suffixed keys above only ever
  // match the originally-seeded rows. companySlug and the tender's
  // referenceNo are both stable no matter how the bidder was created, which
  // is what makes this same fixture data resolve correctly for an imported
  // bidder too. Same eight records, just addressable a second way.
  'chennai-precision-engineering@GEM/2026/B/7983771': { verifiedLocalContentPercent: 62, certifyingAgency: 'DPIIT Registered CA - S. Ramanathan & Co' },
  'coastal-traders@GEM/2026/B/7983771': { verifiedLocalContentPercent: 38, certifyingAgency: 'DPIIT Registered CA - Iyer & Associates' },
  'bharath-msme-fabricators@GEM/2026/B/7983771': { verifiedLocalContentPercent: 55, certifyingAgency: 'DPIIT Registered CA - K. Suresh & Co' },
  'swift-supplies-enterprises@GEM/2026/B/7983771': { verifiedLocalContentPercent: 20, certifyingAgency: 'DPIIT Registered CA - Iyer & Associates' },
  'coromandel-diagnostics@GEM/2026/B/7801588': { verifiedLocalContentPercent: 63, certifyingAgency: 'DPIIT Registered CA - Rao & Narayan' },
  'nucleus-scientific@GEM/2026/B/7827388': { verifiedLocalContentPercent: 70, certifyingAgency: 'DPIIT Registered CA - Rao & Narayan' },
  'apex-medtech@GEM/2026/B/7914955': { verifiedLocalContentPercent: 55, certifyingAgency: 'DPIIT Registered CA - Iyer & Associates' },
  'coromandel-diagnostics@GEM/2026/B/7922011': { verifiedLocalContentPercent: 66, certifyingAgency: 'DPIIT Registered CA - Rao & Narayan' },
};

// --- Synthetic-company pool (tenders 2-10). One entry per identifier, from
//     src/lib/fixtures/syntheticCompanies.ts. `const` on an object/array
//     permits mutation; this runs once at module load, before any provider
//     reads a table.
for (const c of SYNTHETIC_COMPANIES) {
  if (c.registered) {
    if (c.udyamNumber) {
      udyamRegistry[c.udyamNumber] = {
        enterpriseName: c.name,
        category: c.udyamCategory,
        status: 'Active',
        registeredOn: '2021-06-15',
      };
    }
    if (!c.breakGstinChecksum && !c.gstinNull) {
      const g = companyGstin(c);
      if (g) {
        gstRegistry[g] = {
          legalName: c.name,
          status: 'Active',
          lastReturnPeriod: '2026-08',
          returnFilingDelayMonths: c.gstFilingDelayMonths ?? 0,
        };
      }
    }
    panRegistry[c.pan] = {
      holderName: c.name,
      panStatus: 'Valid',
      itFilingStatus: c.itFilingStatus ?? 'Filed',
    };
  }
  if (c.blacklisted) {
    blacklistRegistry.push({
      matchValue: c.pan,
      matchField: 'pan',
      reason: c.blacklistReason ?? 'Debarred by a procuring ministry (simulated)',
      debarredUntil: '2027-12-31',
    });
  }
}
