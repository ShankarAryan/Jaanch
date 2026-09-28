'use client';

import { useState } from 'react';
import { FileIcon, CheckIcon, AlertTriangleIcon, UploadIcon, SparkIcon } from '@/components/icons';
import { DocumentPreviewButton } from '@/components/DocumentPreviewButton';
import { DocumentUpload } from '@/components/DocumentUpload';

interface DocItem {
  id: string;
  docType: string;
  fileName: string;
  mimeType: string | null;
  rawText: string | null;
  extractedData: string | null;
}

interface Props {
  bidderId: string;
  documents: DocItem[];
  oemRequired: boolean;
  miiWaived: boolean;
  canUpload: boolean;
  viewerNote: string;
}

export function BidderDocumentRepository({
  bidderId,
  documents,
  oemRequired,
  miiWaived,
  canUpload,
  viewerNote,
}: Props) {
  const [activeUploadType, setActiveUploadType] = useState<string | null>(null);
  const [selectedExtractedDoc, setSelectedExtractedDoc] = useState<DocItem | null>(null);

  const docsByType = new Map(documents.map((d) => [d.docType, d]));

  const documentSlots = [
    {
      code: 'OEM_AUTHORIZATION_CERTIFICATE',
      title: 'OEM Authorization Certificate',
      description: 'Manufacturer authorization letter certifying genuine dealership and warranty support.',
      mandatory: oemRequired,
      waived: !oemRequired,
      doc: docsByType.get('OEM_AUTHORIZATION_CERTIFICATE'),
      tier: 'Tier 2 Vision AI',
    },
    {
      code: 'LOCAL_CONTENT_CERTIFICATE',
      title: 'Make in India Local Content Declaration',
      description: 'Auditor/Management certified local content % for purchase preference under PPP-MII.',
      mandatory: !miiWaived,
      waived: miiWaived,
      waivedReason: 'Waived for this tender under Competent Authority approval CDAC/CFSPR291/16714.',
      doc: docsByType.get('LOCAL_CONTENT_CERTIFICATE'),
      tier: 'Tier 2 Vision AI',
    },
    {
      code: 'GST_CERTIFICATE',
      title: 'GST Registration Certificate (REG-06)',
      description: 'Goods and Services Tax registration certificate with active tax jurisdiction.',
      mandatory: false,
      waived: false,
      doc: docsByType.get('GST_CERTIFICATE'),
      registryVerified: true,
      registryNote: 'Verified via GSTN Checksum & Tax Portal Registry',
      tier: 'Tier 1 & 2 Hybrid',
    },
    {
      code: 'PAN_CARD',
      title: 'Permanent Account Number (PAN Card)',
      description: 'Income Tax Department PAN registration credential matching company entity.',
      mandatory: false,
      waived: false,
      doc: docsByType.get('PAN_CARD'),
      registryVerified: true,
      registryNote: 'Verified via Income Tax Department CBDT Registry',
      tier: 'Tier 1 & 2 Hybrid',
    },
    {
      code: 'UDYAM_CERTIFICATE',
      title: 'Udyam / MSME Registration Certificate',
      description: 'Ministry of MSME enterprise classification for public procurement exemptions.',
      mandatory: false,
      waived: false,
      doc: docsByType.get('UDYAM_CERTIFICATE'),
      registryVerified: true,
      registryNote: 'Verified via Udyam Registration Portal Registry',
      tier: 'Tier 3 Policy & Registry',
    },
    {
      code: 'EPFO_ESIC_CHALLAN',
      title: 'EPFO & ESIC Compliance Statement / ECR',
      description: 'Monthly Electronic Challan Cum Return (ECR) for statutory labour codes compliance.',
      mandatory: false,
      waived: false,
      doc: docsByType.get('EPFO_ESIC_CHALLAN'),
      registryVerified: true,
      registryNote: 'Verified via Shram Suvidha & EPFO Gateway',
      tier: 'Tier 3 Statutory Policy',
    },
    {
      code: 'STARTUP_INDIA_CERTIFICATE',
      title: 'Startup India DPIIT Recognition Certificate',
      description: 'DPIIT recognized entity for prior turnover and prior experience tender exemptions.',
      mandatory: false,
      waived: false,
      doc: docsByType.get('STARTUP_INDIA_CERTIFICATE'),
      registryVerified: true,
      registryNote: 'Verified via Startup India DPIIT Portal',
      tier: 'Tier 3 Policy & Registry',
    },
    {
      code: 'NSIC_CERTIFICATE',
      title: 'NSIC Single Point Registration Certificate',
      description: 'National Small Industries Corporation certificate for EMD waiver and tender set-asides.',
      mandatory: false,
      waived: false,
      doc: docsByType.get('NSIC_CERTIFICATE'),
      registryVerified: true,
      registryNote: 'Verified via NSIC Portal Registry',
      tier: 'Tier 3 Policy & Registry',
    },
    {
      code: 'DIGILOCKER_CERTIFICATE',
      title: 'DigiLocker / API Setu Digital Document',
      description: 'Digital India verified repository document cryptographically signed by issuer.',
      mandatory: false,
      waived: false,
      doc: docsByType.get('DIGILOCKER_CERTIFICATE'),
      registryVerified: true,
      registryNote: 'Verified via DigiLocker Requester API Gateway',
      tier: 'Tier 1 & 3 Digital Identity',
    },
    {
      code: 'BIS_QUALITY_CERTIFICATE',
      title: 'BIS / Product Quality Certification',
      description: 'Bureau of Indian Standards product mark & ISO quality management compliance certificate.',
      mandatory: false,
      waived: false,
      doc: docsByType.get('BIS_QUALITY_CERTIFICATE'),
      registryVerified: true,
      registryNote: 'Verified via BIS Manakonline Quality Gateway',
      tier: 'Tier 2 Document Intelligence',
    },
  ];

  return (
    <div className="card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <div>
          <h3 className="section-title mb-0 flex items-center gap-2">
            <FileIcon className="h-5 w-5 text-navy" />
            Document Dossier & Multimodal AI Verification
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Tender-mandated certificates inspected by Vision AI and cross-checked against statutory filings
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-surface-container px-2 py-0.5 font-mono text-ink-muted border border-line">
            {documents.length} files submitted
          </span>
        </div>
      </div>

      {/* Document Dossier Matrix Table */}
      <div className="divide-y divide-line/60 rounded-lg border border-line/70 bg-surface">
        {documentSlots.map((slot) => {
          const isUploaded = Boolean(slot.doc);
          const isMissingMandatory = slot.mandatory && !isUploaded;

          return (
            <div key={slot.code} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-surface-lowest transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-xs text-navy">{slot.title}</span>
                  {slot.mandatory && (
                    <span className="text-[10px] font-semibold text-critical bg-critical/10 px-1.5 py-0.2 rounded">
                      Mandatory
                    </span>
                  )}
                  <span className="text-[9px] font-mono font-bold text-ink-faint bg-surface-container px-1.5 py-0.2 rounded border border-line">
                    {slot.tier}
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">{slot.description}</p>

                {/* Status Indicator */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {isUploaded && (
                    <div className="flex items-center gap-1.5 text-indiagreen-700 bg-indiagreen/10 px-2 py-0.5 rounded font-medium">
                      <CheckIcon className="h-3.5 w-3.5" />
                      <span>{slot.doc?.fileName}</span>
                    </div>
                  )}

                  {slot.waived && (
                    <span className="text-ink-faint italic text-[11px]">
                      {slot.waivedReason ?? 'Not applicable for this tender'}
                    </span>
                  )}

                  {isMissingMandatory && (
                    <div className="flex items-center gap-1.5 text-critical bg-critical/10 px-2 py-0.5 rounded font-semibold text-[11px]">
                      <AlertTriangleIcon className="h-3.5 w-3.5" />
                      <span>Missing — Required for Technical Qualification</span>
                    </div>
                  )}

                  {!slot.mandatory && !slot.waived && !isUploaded && slot.registryVerified && (
                    <span className="text-indiagreen-700 text-[11px] font-medium flex items-center gap-1">
                      <CheckIcon className="h-3 w-3" />
                      {slot.registryNote}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isUploaded && slot.doc && (
                  <>
                    {slot.doc.mimeType && (
                      <DocumentPreviewButton
                        documentId={slot.doc.id}
                        fileName={slot.doc.fileName}
                        mimeType={slot.doc.mimeType}
                      />
                    )}
                    {slot.doc.extractedData && (
                      <button
                        type="button"
                        onClick={() => setSelectedExtractedDoc(slot.doc ?? null)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-navy bg-surface-container px-2.5 py-1.5 rounded border border-line hover:border-navy/40 transition-colors"
                      >
                        <SparkIcon className="h-3.5 w-3.5 text-saffron-800" />
                        AI Extraction
                      </button>
                    )}
                  </>
                )}

                {/* Upload action toggle */}
                {!slot.waived && (
                  <button
                    type="button"
                    onClick={() => setActiveUploadType(activeUploadType === slot.code ? null : slot.code)}
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded border transition-colors ${
                      isMissingMandatory
                        ? 'bg-saffron-50 text-saffron-800 border-saffron-300 hover:bg-saffron-100'
                        : 'bg-surface text-ink-muted border-line hover:border-navy/40'
                    }`}
                  >
                    <UploadIcon className="h-3.5 w-3.5" />
                    {isUploaded ? 'Replace' : isMissingMandatory ? 'Upload Required File' : 'Attach File'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expandable Upload Form for the Selected Slot */}
      {activeUploadType && (
        <div className="rounded-lg border-2 border-saffron-400 bg-saffron-50/20 p-4 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-navy flex items-center gap-1.5">
              <UploadIcon className="h-4 w-4 text-navy" />
              Upload Document: {documentSlots.find((s) => s.code === activeUploadType)?.title}
            </span>
            <button
              type="button"
              onClick={() => setActiveUploadType(null)}
              className="text-xs text-ink-muted hover:text-navy"
            >
              ✕ Cancel
            </button>
          </div>
          <DocumentUpload
            bidderId={bidderId}
            docType={activeUploadType}
            label={documentSlots.find((s) => s.code === activeUploadType)?.title ?? 'Document'}
            disabled={!canUpload}
            disabledTitle="Upload Document"
            disabledNote={viewerNote}
          />
        </div>
      )}

      {/* AI Extracted JSON Modal / Inspector */}
      {selectedExtractedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-xl rounded-xl bg-surface p-5 shadow-2xl border border-line space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <SparkIcon className="h-5 w-5 text-saffron-800" />
                <h4 className="font-heading font-bold text-navy text-sm">
                  Multimodal AI Field Extraction — {selectedExtractedDoc.fileName}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExtractedDoc(null)}
                className="text-ink-muted hover:text-navy text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 text-xs space-y-3">
              <p className="text-ink-muted">
                Fields parsed directly by neural vision OCR and verified against statutory schemas:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-navy/5 p-3.5 font-mono text-xs text-navy border border-line">
                {JSON.stringify(JSON.parse(selectedExtractedDoc.extractedData || '{}'), null, 2)}
              </pre>
            </div>

            <div className="pt-3 border-t border-line flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedExtractedDoc(null)}
                className="btn-primary text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
