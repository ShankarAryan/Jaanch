import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { downloadDatasetFile } from '@/lib/supabaseStorage';

export const dynamic = 'force-dynamic';

/**
 * Streams the original dataset file for an ImportBatch back from Supabase
 * Storage. Linked from the "Imported from <file>" provenance line on the
 * tender detail page. Requires any signed-in session (officer / viewer /
 * bidder) - it's not public, but it's not gated by the admin import secret
 * either, since it only ever returns a file that already produced visible
 * tender rows.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!getSession()) {
    return NextResponse.json({ error: 'Sign in to download the source file.' }, { status: 401 });
  }

  const batch = await prisma.importBatch.findUnique({
    where: { id: params.id },
    select: { filename: true, storagePath: true, mimeType: true },
  });
  if (!batch) {
    return NextResponse.json({ error: 'Import batch not found.' }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await downloadDatasetFile(batch.storagePath);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not fetch the file from storage.' },
      { status: 502 },
    );
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': batch.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${batch.filename.replace(/"/g, '')}"`,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, no-store',
    },
  });
}
