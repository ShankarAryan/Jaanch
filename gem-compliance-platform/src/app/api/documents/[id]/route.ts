import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { canViewBidder } from '@/lib/access';

export const dynamic = 'force-dynamic';

/**
 * Streams an uploaded document's file back for inline preview. Linked from the
 * "Preview" pill in the Documents list on the bidder detail page.
 *
 * Access is the exact same gate the bidder detail page uses (canViewBidder):
 * a Bidder session can only preview documents belonging to their own company;
 * an officer / viewer can preview any. A denied or unauthenticated request
 * gets a 404 (not 401/403) - matching the notFound() pattern the page itself
 * uses, so it never reveals whether the document exists.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    select: {
      fileName: true,
      mimeType: true,
      fileData: true,
      bidder: { select: { companySlug: true } },
    },
  });
  if (!doc) return new NextResponse('Not found', { status: 404 });

  const session = getSession();
  if (!canViewBidder(session, doc.bidder.companySlug)) return new NextResponse('Not found', { status: 404 });

  if (!doc.fileData || !doc.mimeType) {
    return new NextResponse('This document has no uploaded file to preview (it was seeded as OCR text only).', {
      status: 404,
    });
  }

  return new NextResponse(new Uint8Array(doc.fileData), {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': `inline; filename="${doc.fileName.replace(/"/g, '')}"`,
      'Cache-Control': 'private, max-age=60',
    },
  });
}
