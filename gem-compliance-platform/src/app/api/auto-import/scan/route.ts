import { NextRequest, NextResponse } from 'next/server';
import { importSecretOk } from '@/lib/import/adminGate';
import { ensureAutoImportWatcher, runAutoImport, setRealtimeEnabled } from '@/lib/import/autoImport';

export const dynamic = 'force-dynamic';

/**
 * Manual "scan the bucket now" trigger for the on-screen panel - runs the
 * exact same diff-and-auto-commit the poll / Realtime paths run (ADD MODE
 * ONLY). Gated by ADMIN_IMPORT_SECRET, like the rest of /admin/import.
 *
 * ?realtime=off|on toggles the Realtime subscription (the polling fallback
 * stays running) - lets you demonstrate that a file still gets picked up
 * with Realtime down.
 */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') ?? req.headers.get('x-admin-import-secret');
  if (!importSecretOk(secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  ensureAutoImportWatcher();

  const rt = req.nextUrl.searchParams.get('realtime');
  if (rt === 'off') setRealtimeEnabled(false);
  else if (rt === 'on') setRealtimeEnabled(true);

  const result = await runAutoImport('manual');
  return NextResponse.json(result);
}
