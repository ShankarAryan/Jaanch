import { NextRequest, NextResponse } from 'next/server';
import { importSecretOk } from '@/lib/import/adminGate';
import { ensureAutoImportWatcher } from '@/lib/import/autoImport';
import { autoImportState } from '@/lib/import/autoImportState';

export const dynamic = 'force-dynamic';

/**
 * Live state of the Storage auto-import watcher, for the on-screen panel on
 * /admin/import. Gated by the same ADMIN_IMPORT_SECRET as the rest of that
 * backstage tool (not the officer/viewer session model). Calling this also
 * lazily starts the watcher if instrumentation.ts didn't.
 */
export async function GET(req: NextRequest) {
  if (!importSecretOk(req.nextUrl.searchParams.get('secret'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  ensureAutoImportWatcher();

  return NextResponse.json({
    bucket: 'dataset-uploads',
    watcherStarted: autoImportState.watcherStarted,
    realtime: autoImportState.realtime,
    realtimeLastEventAt: autoImportState.realtimeLastEventAt,
    lastPollAt: autoImportState.lastPollAt,
    lastPollFoundNew: autoImportState.lastPollFoundNew,
    pollIntervalMs: autoImportState.pollIntervalMs,
    scanning: autoImportState.scanning,
    log: autoImportState.log,
  });
}
