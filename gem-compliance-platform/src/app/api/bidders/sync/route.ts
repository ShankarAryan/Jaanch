import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runAutoImport } from '@/lib/import/autoImport';
import { listDatasetFiles } from '@/lib/supabaseStorage';

export const dynamic = 'force-dynamic';

/**
 * Endpoint to synchronize, clear, or manage the Bidder dataset directly
 * with Supabase Storage.
 *
 * - POST with { action: 'sync' }:
 *   Scans Supabase Storage for dataset files (.xlsx, .csv, .zip).
 *   Auto-imports added files, and automatically deletes bidders whose
 *   source file was removed from Supabase Storage.
 *
 * - POST with { action: 'clear' }:
 *   Erases all bidders, documents, scores, decisions, and verification results
 *   from the database.
 *
 * - GET:
 *   Returns the current count of bidders and status.
 */
export async function GET() {
  try {
    const [bidderCount, tenderCount, storageFiles] = await Promise.all([
      prisma.bidder.count(),
      prisma.tender.count(),
      listDatasetFiles().catch(() => []),
    ]);

    return NextResponse.json({
      success: true,
      bidders: bidderCount,
      tenders: tenderCount,
      storageFilesCount: storageFiles.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'sync';

    // ACTION: Clear all bidders and related records
    if (action === 'clear') {
      const [al, dec, sc, vr, doc, bid] = await prisma.$transaction([
        prisma.auditLog.deleteMany({}),
        prisma.decision.deleteMany({}),
        prisma.score.deleteMany({}),
        prisma.verificationResult.deleteMany({}),
        prisma.document.deleteMany({}),
        prisma.bidder.deleteMany({}),
        prisma.importBatch.updateMany({ data: { revertedAt: new Date() } }),
      ]);

      return NextResponse.json({
        success: true,
        action: 'clear',
        message: `Erased ${bid.count} bidders, ${doc.count} documents, ${sc.count} scores, and ${dec.count} decisions.`,
        deletedBidders: bid.count,
      });
    }

    // ACTION: Sync with Supabase Storage
    if (action === 'sync') {
      // 1. Run the storage auto-import engine in manual mode (scans bucket & purges deleted imports)
      const importResult = await runAutoImport('manual');

      // 2. Count remaining live bidders
      const liveBidders = await prisma.bidder.count();

      return NextResponse.json({
        success: true,
        action: 'sync',
        scanned: importResult.scanned,
        newFiles: importResult.newFiles,
        liveBidders,
        message: `Synchronized with Supabase Storage. Total active bidders: ${liveBidders}.`,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
