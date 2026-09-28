import { ScanIcon } from '@/components/icons';
import { OcrWorkbench } from '@/components/OcrWorkbench';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DocumentOcrPage() {
  const bidders = await prisma.bidder.findMany({
    select: {
      id: true,
      name: true,
      companySlug: true,
      tender: { select: { referenceNo: true } },
    },
    orderBy: { name: 'asc' },
  });

  const formattedBidders = bidders.map((b) => ({
    id: b.id,
    name: b.name,
    companySlug: b.companySlug,
    tenderRef: b.tender?.referenceNo,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <ScanIcon className="h-6 w-6 text-navy" />
          <h1 className="font-heading text-2xl font-bold text-navy">AI Document OCR & Storage Pipeline</h1>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Multimodal vision intelligence pipeline connected to Supabase Storage. Automatically transcribes scanned documents, decodes statutory identifiers, runs checksums, and synchronizes with GeM bidder records.
        </p>
      </div>

      <OcrWorkbench bidders={formattedBidders} />
    </div>
  );
}
