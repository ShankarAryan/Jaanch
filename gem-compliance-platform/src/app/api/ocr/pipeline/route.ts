import { NextRequest, NextResponse } from 'next/server';
import {
  listPipelineDocuments,
  syncStorageOcrPipeline,
  uploadAndProcessStorageDocument,
  linkOcrDocumentToBidder,
} from '@/lib/ai/ocrStoragePipeline';
import { listDatasetFiles } from '@/lib/supabaseStorage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [docs, storageFiles] = await Promise.all([
      listPipelineDocuments(),
      listDatasetFiles().catch(() => []),
    ]);

    return NextResponse.json({
      success: true,
      documents: docs,
      storageFileCount: storageFiles.length,
    });
  } catch (err: any) {
    console.error('[api/ocr/pipeline] GET error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve pipeline documents' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Action 1: Upload directly to Supabase Storage and run OCR
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = file.type || 'application/pdf';

      const result = await uploadAndProcessStorageDocument(file.name, buffer, mimeType);

      return NextResponse.json({
        success: true,
        document: result,
      });
    }

    // Action 2: JSON action (sync or link)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { action } = body;

      if (action === 'sync') {
        const stats = await syncStorageOcrPipeline();
        const docs = await listPipelineDocuments();
        return NextResponse.json({
          success: true,
          stats,
          documents: docs,
        });
      }

      if (action === 'link') {
        const { storagePath, bidderId } = body;
        if (!storagePath || !bidderId) {
          return NextResponse.json({ error: 'storagePath and bidderId are required' }, { status: 400 });
        }
        await linkOcrDocumentToBidder(storagePath, bidderId);
        return NextResponse.json({ success: true, message: 'Document linked to bidder' });
      }
    }

    return NextResponse.json({ error: 'Unsupported request format' }, { status: 400 });
  } catch (err: any) {
    console.error('[api/ocr/pipeline] POST error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process pipeline request' },
      { status: 500 },
    );
  }
}
