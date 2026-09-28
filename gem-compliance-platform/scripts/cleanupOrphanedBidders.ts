import { PrismaClient } from '@prisma/client';

/**
 * ONE-TIME manual cleanup: remove the bidders that predate the
 * Bidder.importBatchId column (all have importBatchId IS NULL) and whose
 * source spreadsheet is no longer in the dataset-uploads bucket.
 *
 * The confirm-before-delete cascade in src/lib/import/autoImport.ts only
 * covers bidders that carry an importBatchId - these don't, so they need a
 * deliberate manual sweep. Standalone, like scripts/seedRegistries.ts: its
 * own PrismaClient, not wired into `npm run seed` or any app route.
 *
 * Safe by default:
 *   npx tsx scripts/cleanupOrphanedBidders.ts            -> dry run, prints only
 *   npx tsx scripts/cleanupOrphanedBidders.ts --confirm  -> actually deletes
 *
 * Deletes in the same FK-safe order as cascadeDeleteImport (AuditLog ->
 * Decision -> Score -> VerificationResult -> Document -> Bidder), scoped
 * strictly to the IDs snapshotted BEFORE any delete - never a fresh
 * importBatchId IS NULL query at delete time (avoids a race with a row
 * created mid-run). Tender and ImportBatch rows are never touched.
 */

const prisma = new PrismaClient();
const CONFIRM = process.argv.includes('--confirm');

const TABLES = ['tender', 'importBatch', 'bidder', 'document', 'score', 'decision', 'verificationResult', 'auditLog'] as const;

async function counts() {
  const [tender, importBatch, bidder, document, score, decision, verificationResult, auditLog] = await Promise.all([
    prisma.tender.count(),
    prisma.importBatch.count(),
    prisma.bidder.count(),
    prisma.document.count(),
    prisma.score.count(),
    prisma.decision.count(),
    prisma.verificationResult.count(),
    prisma.auditLog.count(),
  ]);
  return { tender, importBatch, bidder, document, score, decision, verificationResult, auditLog } as Record<
    (typeof TABLES)[number],
    number
  >;
}

async function main() {
  // --- Step 1: snapshot the targets BEFORE deleting anything ---
  const snapshot = await prisma.bidder.findMany({
    where: { importBatchId: null },
    select: { id: true, name: true, tender: { select: { title: true, referenceNo: true } } },
    orderBy: [{ tender: { referenceNo: 'asc' } }, { name: 'asc' }],
  });
  const ids = snapshot.map((b) => b.id);

  console.log(`\n${snapshot.length} bidder(s) with importBatchId IS NULL — targets for deletion:\n`);
  for (const b of snapshot) {
    console.log(`  ${b.name.padEnd(38)}  ${b.tender.referenceNo.padEnd(20)}  ${b.id}`);
  }
  console.log(`\n  total: ${snapshot.length}`);

  const before = await counts();

  if (ids.length === 0) {
    console.log('\nNothing to delete. Exiting.');
    return;
  }

  if (!CONFIRM) {
    console.log('\n--- DRY RUN (no --confirm flag) ---');
    console.log('Would delete, in FK-safe order, everything hanging off exactly those', ids.length, 'bidder id(s):');
    const [doc, sc, dec, vr, al] = await Promise.all([
      prisma.document.count({ where: { bidderId: { in: ids } } }),
      prisma.score.count({ where: { bidderId: { in: ids } } }),
      prisma.decision.count({ where: { bidderId: { in: ids } } }),
      prisma.verificationResult.count({ where: { bidderId: { in: ids } } }),
      prisma.auditLog.count({ where: { bidderId: { in: ids } } }),
    ]);
    console.log(`  auditLog ${al}, decision ${dec}, score ${sc}, verificationResult ${vr}, document ${doc}, bidder ${ids.length}`);
    console.log('  Tender and ImportBatch: untouched.');
    console.log('\nRe-run with --confirm to actually delete.');
    console.log('\nBEFORE counts:', JSON.stringify(before));
    return;
  }

  // --- Step 3: delete, FK-safe order, scoped to the snapshotted IDs only ---
  const where = { bidderId: { in: ids } };
  const [al, dec, sc, vr, doc, bid] = await prisma.$transaction([
    prisma.auditLog.deleteMany({ where }),
    prisma.decision.deleteMany({ where }),
    prisma.score.deleteMany({ where }),
    prisma.verificationResult.deleteMany({ where }),
    prisma.document.deleteMany({ where }),
    prisma.bidder.deleteMany({ where: { id: { in: ids } } }),
  ]);

  const after = await counts();

  console.log('\n--- DELETED ---');
  console.log(`  auditLog ${al.count}, decision ${dec.count}, score ${sc.count}, verificationResult ${vr.count}, document ${doc.count}, bidder ${bid.count}`);

  console.log('\n--- BEFORE / AFTER ---');
  console.log('  table                 before   after   delta');
  for (const t of TABLES) {
    const d = after[t] - before[t];
    console.log(`  ${t.padEnd(20)} ${String(before[t]).padStart(7)} ${String(after[t]).padStart(7)} ${(d > 0 ? '+' + d : String(d)).padStart(7)}`);
  }

  const tenderOk = after.tender === before.tender;
  const batchOk = after.importBatch === before.importBatch;
  console.log(`\n  Tender count unchanged:      ${tenderOk ? 'YES' : 'NO'} (${before.tender} -> ${after.tender})`);
  console.log(`  ImportBatch count unchanged: ${batchOk ? 'YES' : 'NO'} (${before.importBatch} -> ${after.importBatch})`);
  console.log(`  Bidders removed:             ${bid.count} (expected ${ids.length})`);

  const leftover = await prisma.bidder.count({ where: { id: { in: ids } } });
  console.log(`  Snapshotted bidders remaining: ${leftover}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
