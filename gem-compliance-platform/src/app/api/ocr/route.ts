import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { processDocumentOcr } from '@/lib/ai/ocrService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Case 1: Sample Document request by preset key
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const sampleKey = body.sampleKey as string;

      let fixtureFilename = 'sample-oem-authorization-letter.pdf';
      if (sampleKey === 'local_content') {
        fixtureFilename = 'sample-local-content-certificate.pdf';
      } else if (sampleKey === 'tender') {
        fixtureFilename = 'sample-tender-GEM-2026-B-7983771.pdf';
      }

      const filePath = path.join(process.cwd(), 'scripts', 'fixtures', fixtureFilename);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: `Sample fixture ${fixtureFilename} not found` }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(filePath);
      const base64 = fileBuffer.toString('base64');
      const result = await processDocumentOcr(base64, 'application/pdf', fixtureFilename);

      return NextResponse.json({
        success: true,
        fileName: fixtureFilename,
        fileSize: `${(fileBuffer.length / 1024).toFixed(1)} KB`,
        result,
      });
    }

    // Case 2: Multi-part file upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const mimeType = file.type || 'application/pdf';

      const result = await processDocumentOcr(base64, mimeType, file.name);

      return NextResponse.json({
        success: true,
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        result,
      });
    }

    return NextResponse.json({ error: 'Unsupported Content-Type. Send JSON or multipart/form-data.' }, { status: 400 });
  } catch (err) {
    console.error('[api/ocr] Error processing OCR:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process document OCR' },
      { status: 500 },
    );
  }
}
