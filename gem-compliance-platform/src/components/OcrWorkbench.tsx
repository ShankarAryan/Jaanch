'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ScanIcon,
  CheckIcon,
  ShieldCheckIcon,
  FileIcon,
  RefreshIcon,
  ClipboardIcon,
  LayersIcon,
  SparkIcon,
  InfoIcon,
} from '@/components/icons';
import type { StorageOcrItem } from '@/lib/ai/ocrStoragePipeline';
import type { OcrResult } from '@/lib/ai/ocrService';

interface BidderOption {
  id: string;
  name: string;
  companySlug: string;
  tenderRef?: string;
}

export function OcrWorkbench({ bidders = [] }: { bidders?: BidderOption[] }) {
  // Navigation Mode: Supabase Cloud Storage vs Live OEM & Document Scanner
  const [activeTab, setActiveTab] = useState<'supabase' | 'live'>('supabase');

  // Supabase Pipeline State
  const [pipelineDocs, setPipelineDocs] = useState<StorageOcrItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<StorageOcrItem | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Live OEM / Document Scanner State
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveResult, setLiveResult] = useState<OcrResult | null>(null);
  const [liveFileName, setLiveFileName] = useState<string | null>(null);
  const [liveFileSize, setLiveFileSize] = useState<string | null>(null);
  const [liveViewTab, setLiveViewTab] = useState<'summary' | 'text' | 'json'>('summary');
  const [liveCopied, setLiveCopied] = useState(false);

  useEffect(() => {
    loadPipelineDocs();
  }, []);

  async function loadPipelineDocs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ocr/pipeline');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch pipeline documents');
      setPipelineDocs(data.documents || []);
    } catch (err: any) {
      setError(err.message || 'Error loading pipeline documents');
    } finally {
      setLoading(false);
    }
  }

  // Sync Supabase Storage bucket, run Vision OCR, link bidders, and calculate scores
  async function handleSyncPipeline() {
    setSyncing(true);
    setError(null);
    setSyncSummary(null);
    try {
      const res = await fetch('/api/ocr/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync with Supabase Storage');

      setPipelineDocs(data.documents || []);
      setSyncSummary(
        `Scanned ${data.scanned} files in Supabase Storage · Processed ${data.processed} documents · Calculated compliance scores for ${data.scored} bidders`,
      );
      setTimeout(() => setSyncSummary(null), 8000);
    } catch (err: any) {
      setError(err.message || 'Error syncing pipeline');
    } finally {
      setSyncing(false);
    }
  }

  // Link document to a specific bidder in the dataset
  async function handleLinkBidder(storagePath: string, bidderId: string) {
    if (!bidderId) return;
    try {
      const res = await fetch('/api/ocr/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link', storagePath, bidderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to link document');

      await loadPipelineDocs();
    } catch (err: any) {
      alert(`Linking failed: ${err.message}`);
    }
  }

  // Run live OCR with built-in presets (OEM, Local Content, Tender)
  async function handleRunSample(sampleKey: 'oem' | 'local_content' | 'tender') {
    setLiveLoading(true);
    setLiveError(null);
    setLiveResult(null);

    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process live OCR');

      setLiveResult(data.result);
      setLiveFileName(data.fileName);
      setLiveFileSize(data.fileSize);
    } catch (err: any) {
      setLiveError(err.message || 'Error processing live OCR');
    } finally {
      setLiveLoading(false);
    }
  }

  // Run live OCR with custom ad-hoc file
  async function handleLiveFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLiveLoading(true);
    setLiveError(null);
    setLiveResult(null);
    setLiveFileName(file.name);
    setLiveFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/ocr', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to scan document');
      setLiveResult(data.result);
    } catch (err: any) {
      setLiveError(err.message || 'Error scanning document');
    } finally {
      setLiveLoading(false);
    }
  }

  // Filter documents in Supabase tab
  const filteredDocs = pipelineDocs.filter((d) => {
    const matchesFilter =
      filterType === 'ALL' ||
      (filterType === 'MII' && d.docType?.includes('LOCAL')) ||
      (filterType === 'OEM' && d.docType?.includes('OEM')) ||
      (filterType === 'GST' && d.docType?.includes('GST')) ||
      (filterType === 'PAN' && d.docType?.includes('PAN')) ||
      (filterType === 'UDYAM' && d.docType?.includes('UDYAM'));

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      d.fileName.toLowerCase().includes(q) ||
      d.matchedBidderName?.toLowerCase().includes(q) ||
      d.docTypeLabel?.toLowerCase().includes(q) ||
      d.matchedTenderRef?.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  const totalDocs = pipelineDocs.length;
  const scoredDocs = pipelineDocs.filter((d) => d.complianceScore !== null).length;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* MAIN NAVIGATION TAB SWITCHER                                              */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <button
          onClick={() => setActiveTab('supabase')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${
            activeTab === 'supabase'
              ? 'bg-navy text-white shadow-xs'
              : 'bg-surface-lowest text-ink-muted hover:bg-surface-low hover:text-navy border border-line'
          }`}
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>☁️ Supabase Cloud Storage Documents</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${activeTab === 'supabase' ? 'bg-white/20 text-white' : 'bg-surface-container text-ink'}`}>
            {totalDocs}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${
            activeTab === 'live'
              ? 'bg-navy text-white shadow-xs'
              : 'bg-surface-lowest text-ink-muted hover:bg-surface-low hover:text-navy border border-line'
          }`}
        >
          <SparkIcon className="h-3.5 w-3.5 text-amber-400" />
          <span>⚡ Live OEM & Document Vision Scanner</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SUPABASE CLOUD STORAGE PIPELINE VIEW                               */}
      {/* ========================================================================= */}
      {activeTab === 'supabase' && (
        <div className="space-y-6">
          {/* Top Status & Sync Action Bar */}
          <div className="rounded-xl border border-line bg-surface-lowest p-5 shadow-card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="font-heading text-lg font-bold text-navy">
                    Supabase Storage Document Pipeline
                  </h2>
                  <span className="rounded bg-navy/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-navy">
                    bucket: dataset-uploads
                  </span>
                </div>
                <p className="text-xs text-ink-muted">
                  Upload documents (MII, OEM, GST, PAN, Udyam) directly into your Supabase Storage bucket.
                  Click <strong>Sync Supabase</strong> to transcribe text, identify bidders, and compute live compliance scores.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-low hover:text-navy transition-colors"
                >
                  <InfoIcon className="h-4 w-4" />
                  <span>{showGuide ? 'Hide Guide' : 'Supabase Upload Guide'}</span>
                </button>

                {/* Primary Action: Sync & Calculate Scores */}
                <button
                  onClick={handleSyncPipeline}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-navy-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <RefreshIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Extracting & Scoring…' : 'Sync Supabase & Calculate Scores'}</span>
                </button>
              </div>
            </div>

            {/* Sync Summary Notification */}
            {syncSummary && (
              <div className="mt-3.5 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-800">
                <CheckIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{syncSummary}</span>
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div className="mt-3.5 rounded-lg bg-critical/10 border border-critical/30 p-3 text-xs text-critical-fg">
                ⚠️ {error}
              </div>
            )}

            {/* Stat badges */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-line/60 pt-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-low text-navy">
                  <FileIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-ink-faint">Storage Files</p>
                  <p className="font-heading text-sm font-bold text-navy">{totalDocs}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                  <ShieldCheckIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-ink-faint">Scored Bidders</p>
                  <p className="font-heading text-sm font-bold text-emerald-700">{scoredDocs}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-saffron/10 text-saffron-800">
                  <LayersIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-ink-faint">Tenders Connected</p>
                  <p className="font-heading text-sm font-bold text-saffron-800">10 Active Bids</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-container text-ink">
                  <SparkIcon className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-ink-faint">Vision Engine</p>
                  <p className="font-heading text-xs font-bold text-ink">Gemini 2.5 Multimodal</p>
                </div>
              </div>
            </div>
          </div>

          {/* Supabase Upload Guide Drawer */}
          {showGuide && (
            <div className="rounded-xl border border-line bg-surface-low/50 p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-sm font-bold text-navy flex items-center gap-2">
                  <span>📖 How to Upload Documents Directly into Supabase Storage</span>
                </h3>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-xs text-ink-faint hover:text-ink"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-xs text-ink-muted">
                <div className="rounded-lg bg-surface-lowest border border-line p-3.5 space-y-2">
                  <p className="font-semibold text-navy">Option 1: Recommended File Naming Convention</p>
                  <p>In your Supabase Storage dashboard, upload directly into bucket <code className="bg-surface-low px-1 py-0.5 rounded font-mono text-navy">dataset-uploads</code> using:</p>
                  <div className="bg-slate-900 text-slate-100 p-2.5 rounded font-mono text-[11px] space-y-1">
                    <p className="text-amber-300">&lt;companySlug&gt;__&lt;docType&gt;.pdf</p>
                    <p className="text-slate-400"># Examples:</p>
                    <p>sentinel-imaging__mii.pdf <span className="text-slate-400">(Make in India)</span></p>
                    <p>coromandel-diagnostics__oem.jpg <span className="text-slate-400">(OEM Auth)</span></p>
                    <p>hindustan-refineries__gst.pdf <span className="text-slate-400">(GST Certificate)</span></p>
                    <p>tata-petrochem__pan.pdf <span className="text-slate-400">(PAN Card)</span></p>
                    <p>apex-instruments__udyam.pdf <span className="text-slate-400">(MSME Udyam)</span></p>
                  </div>
                </div>

                <div className="rounded-lg bg-surface-lowest border border-line p-3.5 space-y-2">
                  <p className="font-semibold text-navy">Option 2: Zero-Config AI Content Auto-Detection</p>
                  <p>
                    You can upload any arbitrary scan (e.g. <code className="bg-surface-low px-1 py-0.5 rounded font-mono">Scan_OEM_2026.pdf</code>).
                  </p>
                  <p>
                    The Multimodal Vision OCR reads the document text, extracts company trade names and
                    GSTIN/PAN tax IDs, automatically links it to the corresponding Bidder in your dataset,
                    and computes the updated compliance score!
                  </p>
                  <div className="rounded border border-amber-300 bg-amber-50/80 p-2 text-[11px] text-amber-900">
                    💡 <strong>Tip:</strong> After uploading to Supabase, click <strong>"Sync Supabase & Calculate Scores"</strong> to ingest, extract, and score automatically.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'ALL', label: 'All Documents' },
                { key: 'MII', label: 'Make in India (Local Content)' },
                { key: 'OEM', label: 'OEM Authorization' },
                { key: 'GST', label: 'GSTIN' },
                { key: 'PAN', label: 'PAN' },
                { key: 'UDYAM', label: 'Udyam MSME' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilterType(t.key)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    filterType === t.key
                      ? 'bg-navy text-white shadow-2xs'
                      : 'bg-surface-lowest border border-line text-ink-muted hover:bg-surface-low hover:text-navy'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by bidder, file name, or tender…"
              className="rounded-md border border-line bg-surface-lowest px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy w-full sm:w-72"
            />
          </div>

          {/* Documents Table with Extracted Text Snippet, Linked Bidder, and Score */}
          <div className="overflow-x-auto rounded-lg border border-line bg-surface-lowest shadow-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface-low/50 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Storage Document</th>
                  <th className="px-3 py-3">Doc Type</th>
                  <th className="px-3 py-3">Transcribed Extracted Text & Entities</th>
                  <th className="px-3 py-3">Linked Bidder & Tender</th>
                  <th className="px-3 py-3 text-center">Compliance Score</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-ink-muted">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshIcon className="h-4 w-4 animate-spin text-navy" />
                        <span>Loading documents from Supabase Storage pipeline…</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-ink-muted">
                      No documents found in Supabase Storage matching your filter.
                      <p className="mt-1 text-[11px] text-ink-faint">
                        Upload files directly to the <code className="font-mono">dataset-uploads</code> bucket and click <strong>"Sync Supabase"</strong>.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => {
                    const isMII = doc.docType?.includes('LOCAL');
                    const isOEM = doc.docType?.includes('OEM');
                    const isGST = doc.docType?.includes('GST');
                    const isPAN = doc.docType?.includes('PAN');
                    const isUdyam = doc.docType?.includes('UDYAM');

                    return (
                      <tr key={doc.id} className="hover:bg-surface-low/40 transition-colors">
                        {/* File Name & Preview Link */}
                        <td className="px-4 py-3 min-w-[190px]">
                          <div className="flex items-center gap-2">
                            <FileIcon className="h-4 w-4 text-navy shrink-0" />
                            <div className="min-w-0">
                              <a
                                href={doc.publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-ink hover:text-navy hover:underline truncate block"
                                title="Open original in Supabase Storage"
                              >
                                {doc.fileName}
                              </a>
                              <span className="text-[10px] text-ink-faint">
                                {doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(1)} KB` : 'Cloud file'} ·{' '}
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Doc Type Badge */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {isMII ? (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-300">
                              🇮🇳 Make In India (MII)
                            </span>
                          ) : isOEM ? (
                            <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200">
                              🏭 OEM Authorization
                            </span>
                          ) : isGST ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                              ⚖️ GST Certificate
                            </span>
                          ) : isPAN ? (
                            <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-200">
                              💳 PAN Card
                            </span>
                          ) : isUdyam ? (
                            <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200">
                              🏢 Udyam MSME
                            </span>
                          ) : (
                            <span className="rounded bg-surface-container px-2 py-0.5 text-[11px] font-medium text-ink">
                              {doc.docTypeLabel || 'Compliance Doc'}
                            </span>
                          )}
                        </td>

                        {/* Transcribed Extracted Text & Entities */}
                        <td className="px-3 py-3 min-w-[280px]">
                          <div className="space-y-1 text-[11px]">
                            {/* Verbatim quote snippet */}
                            {doc.rawText && (
                              <p className="line-clamp-2 rounded bg-surface-low/70 border border-line/50 p-1.5 font-mono text-[10.5px] text-ink leading-relaxed">
                                &ldquo;{doc.rawText.trim().replace(/\s+/g, ' ').slice(0, 140)}…&rdquo;
                              </p>
                            )}

                            {/* Key structured facts */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-ink-muted">
                              {doc.validation?.localContentCheck?.percent !== undefined && (
                                <span className="font-semibold text-amber-800">
                                  Local Content: {doc.validation.localContentCheck.percent}% ({doc.validation.localContentCheck.isClass1 ? 'Class-I' : 'Class-II'})
                                </span>
                              )}
                              {doc.entities?.identifier && (
                                <span className="font-mono text-ink">
                                  ID: {doc.entities.identifier}
                                </span>
                              )}
                              {doc.entities?.entityName && (
                                <span className="truncate max-w-[220px]">
                                  Org: {doc.entities.entityName}
                                </span>
                              )}
                              {doc.entities?.date && (
                                <span>Dated: {doc.entities.date}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Linked Bidder & Tender */}
                        <td className="px-3 py-3 min-w-[200px]">
                          {doc.matchedBidderId ? (
                            <div className="space-y-0.5">
                              <Link
                                href={`/bidders/${doc.matchedBidderId}`}
                                className="font-semibold text-navy hover:underline block leading-tight text-xs"
                              >
                                {doc.matchedBidderName}
                              </Link>
                              {doc.matchedTenderRef ? (
                                <span className="font-mono text-[10px] text-ink-faint block">
                                  Tender: {doc.matchedTenderRef}
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-700 font-medium">Linked to dossier</span>
                              )}
                            </div>
                          ) : (
                            <select
                              className="rounded border border-line bg-surface-lowest px-2 py-1 text-[11px] text-ink-muted focus:border-navy focus:outline-none"
                              defaultValue=""
                              onChange={(e) => handleLinkBidder(doc.storagePath, e.target.value)}
                            >
                              <option value="" disabled>
                                Link to Bidder…
                              </option>
                              {bidders.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name} ({b.companySlug})
                                </option>
                              ))}
                            </select>
                          )}
                        </td>

                        {/* Compliance Score */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {doc.complianceScore !== null ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                                doc.riskLevel === 'LOW'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : doc.riskLevel === 'MEDIUM'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              <span>{Math.round(doc.complianceScore)}%</span>
                              <span className="text-[10px] font-semibold uppercase">
                                · {doc.riskLevel}
                              </span>
                            </span>
                          ) : (
                            <span className="rounded bg-surface-low px-2 py-0.5 text-[10px] text-ink-faint font-medium">
                              Pending scoring
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedDoc(doc)}
                              className="rounded border border-line bg-surface-lowest px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-surface-low hover:text-navy transition-colors"
                            >
                              Full Text
                            </button>

                            {doc.matchedBidderId && (
                              <Link
                                href={`/bidders/${doc.matchedBidderId}`}
                                className="rounded bg-navy px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-navy-700 transition-colors"
                              >
                                Dossier →
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIVE OEM & DOCUMENT VISION SCANNER                                 */}
      {/* ========================================================================= */}
      {activeTab === 'live' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Presets Header Card */}
          <div className="rounded-xl border border-line bg-surface-lowest p-5 shadow-card space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-heading text-base font-bold text-navy flex items-center gap-2">
                  <SparkIcon className="h-5 w-5 text-amber-500" />
                  <span>Interactive Live OEM & Document Extraction Terminal</span>
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Test and inspect live Multimodal Vision OCR extraction in real-time. Choose a preset fixture or test any certificate.
                </p>
              </div>

              {/* Ad-hoc file tester */}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface-low px-3 py-1.5 text-xs font-semibold text-navy hover:bg-surface-container transition-colors">
                <span>Scan Custom Document</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  disabled={liveLoading}
                  onChange={handleLiveFileUpload}
                />
              </label>
            </div>

            {/* Quick 1-Click Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
              <span className="text-[11px] font-semibold uppercase text-ink-faint mr-1">1-Click Presets:</span>
              <button
                onClick={() => handleRunSample('oem')}
                disabled={liveLoading}
                className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 transition-colors shadow-2xs"
              >
                <span>🏭 Sample OEM Authorization Letter</span>
              </button>

              <button
                onClick={() => handleRunSample('local_content')}
                disabled={liveLoading}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
              >
                <span>🇮🇳 Sample Make in India Certificate</span>
              </button>

              <button
                onClick={() => handleRunSample('tender')}
                disabled={liveLoading}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 transition-colors shadow-2xs"
              >
                <span>📜 Sample GeM Tender Document</span>
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {liveLoading && (
            <div className="rounded-xl border border-line bg-surface-lowest p-8 text-center space-y-2 shadow-card">
              <RefreshIcon className="h-6 w-6 animate-spin text-navy mx-auto" />
              <p className="font-heading text-sm font-bold text-navy">Running Multimodal Vision OCR Engine…</p>
              <p className="text-xs text-ink-muted">Transcribing document pages, reading OEM authorization scopes, and running checksums.</p>
            </div>
          )}

          {/* Error Banner */}
          {liveError && (
            <div className="rounded-xl border border-critical/30 bg-critical/10 p-4 text-xs text-critical-fg">
              ⚠️ {liveError}
            </div>
          )}

          {/* Live Result View */}
          {liveResult && !liveLoading && (
            <div className="rounded-xl border border-line bg-surface-lowest shadow-card overflow-hidden">
              {/* Header */}
              <div className="border-b border-line bg-surface-low/50 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-navy px-2 py-0.5 text-xs font-bold text-white">
                      {liveResult.docTypeLabel}
                    </span>
                    <span className="font-semibold text-ink text-xs">{liveFileName}</span>
                    <span className="text-[11px] text-ink-faint">({liveFileSize})</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                    <span>Confidence: <strong>{Math.round(liveResult.confidence * 100)}%</strong></span>
                    <span>·</span>
                    <span className={liveResult.isAuthentic ? 'text-emerald-700 font-semibold' : 'text-critical font-semibold'}>
                      {liveResult.isAuthentic ? '✓ Verified Authentic' : '⚠ Tamper Flagged'}
                    </span>
                  </div>
                </div>

                {/* Sub-tab view switcher */}
                <div className="flex items-center gap-1 bg-surface-container p-1 rounded-md">
                  <button
                    onClick={() => setLiveViewTab('summary')}
                    className={`px-3 py-1 text-xs font-semibold rounded ${liveViewTab === 'summary' ? 'bg-navy text-white shadow-2xs' : 'text-ink-muted hover:text-navy'}`}
                  >
                    Summary & Entities
                  </button>
                  <button
                    onClick={() => setLiveViewTab('text')}
                    className={`px-3 py-1 text-xs font-semibold rounded ${liveViewTab === 'text' ? 'bg-navy text-white shadow-2xs' : 'text-ink-muted hover:text-navy'}`}
                  >
                    Verbatim OCR Text
                  </button>
                  <button
                    onClick={() => setLiveViewTab('json')}
                    className={`px-3 py-1 text-xs font-semibold rounded ${liveViewTab === 'json' ? 'bg-navy text-white shadow-2xs' : 'text-ink-muted hover:text-navy'}`}
                  >
                    Structured JSON
                  </button>
                </div>
              </div>

              {/* Sub-tab 1: Summary & Entities */}
              {liveViewTab === 'summary' && (
                <div className="p-5 space-y-4">
                  <div>
                    <h4 className="font-semibold text-navy text-xs mb-1">Executive Summary</h4>
                    <p className="rounded-lg bg-surface-low/60 border border-line p-3 text-xs leading-relaxed text-ink">
                      {liveResult.summary}
                    </p>
                  </div>

                  {/* Statutory Checks */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {liveResult.validation?.localContentCheck && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                        <p className="text-[10px] font-bold uppercase text-amber-900">Local Content (MII)</p>
                        <p className="font-heading text-lg font-bold text-amber-900 mt-1">
                          {liveResult.validation.localContentCheck.percent}%
                        </p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          {liveResult.validation.localContentCheck.isClass1 ? 'Class-I Eligible (>=50%)' : 'Class-II (>=20%)'}
                        </p>
                      </div>
                    )}

                    {liveResult.validation?.panCheck && (
                      <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3">
                        <p className="text-[10px] font-bold uppercase text-sky-900">PAN Validation</p>
                        <p className="font-heading text-sm font-bold text-sky-900 mt-1">
                          {liveResult.validation.panCheck.valid ? '✓ Luhn & Regex Passed' : '✗ Invalid Format'}
                        </p>
                        <p className="text-[11px] text-sky-800 mt-0.5">
                          Holder Type: {liveResult.validation.panCheck.holderType || 'Company (C)'}
                        </p>
                      </div>
                    )}

                    {liveResult.validation?.gstinCheck && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
                        <p className="text-[10px] font-bold uppercase text-emerald-900">GSTIN Verification</p>
                        <p className="font-heading text-sm font-bold text-emerald-900 mt-1">
                          {liveResult.validation.gstinCheck.valid ? '✓ Mod-36 Checksum Valid' : '✗ Checksum Tampered'}
                        </p>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          {liveResult.validation.gstinCheck.reason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Extracted Entity Key-Values */}
                  <div>
                    <h4 className="font-semibold text-navy text-xs mb-1.5">Extracted Key Entity Facts</h4>
                    <div className="rounded-lg border border-line bg-surface-low/30 p-3 font-mono text-[11px] space-y-1.5">
                      {Object.entries(liveResult.entities || {}).map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-line/40 py-1">
                          <span className="text-ink-faint font-medium">{k}:</span>
                          <span className="text-navy font-bold">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Verbatim Text */}
              {liveViewTab === 'text' && (
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-muted">Raw text extracted by Multimodal Vision OCR:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(liveResult.rawText || '');
                        setLiveCopied(true);
                        setTimeout(() => setLiveCopied(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-saffron-800 hover:underline font-medium"
                    >
                      <ClipboardIcon className="h-3.5 w-3.5" />
                      <span>{liveCopied ? 'Copied!' : 'Copy Verbatim Text'}</span>
                    </button>
                  </div>
                  <pre className="max-h-96 overflow-y-auto rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                    {liveResult.rawText}
                  </pre>
                </div>
              )}

              {/* Sub-tab 3: JSON */}
              {liveViewTab === 'json' && (
                <div className="p-5 space-y-2">
                  <pre className="max-h-96 overflow-y-auto rounded-lg bg-slate-900 text-emerald-400 p-4 font-mono text-xs whitespace-pre-wrap">
                    {JSON.stringify(liveResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / INSPECTOR FOR FULL EXTRACTED OCR ENTITIES                         */}
      {/* ========================================================================= */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-line bg-surface-lowest shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line bg-surface-low/60 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <ScanIcon className="h-5 w-5 text-navy" />
                <h3 className="font-heading text-sm font-bold text-navy truncate max-w-md">
                  {selectedDoc.fileName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="rounded p-1 text-ink-faint hover:bg-surface-low hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Key Details Card */}
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-low/40 p-3 border border-line/70">
                <div>
                  <span className="text-[10px] text-ink-faint uppercase font-semibold">Document Type:</span>
                  <p className="font-semibold text-navy">{selectedDoc.docTypeLabel || selectedDoc.docType}</p>
                </div>
                <div>
                  <span className="text-[10px] text-ink-faint uppercase font-semibold">Linked Bidder:</span>
                  <p className="font-semibold text-ink">{selectedDoc.matchedBidderName || 'Unmatched'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-ink-faint uppercase font-semibold">Compliance Score:</span>
                  <p className="font-bold text-emerald-700">
                    {selectedDoc.complianceScore !== null ? `${Math.round(selectedDoc.complianceScore)}% (${selectedDoc.riskLevel} Risk)` : 'Not computed'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-ink-faint uppercase font-semibold">Confidence / Integrity:</span>
                  <p className="text-ink">
                    {selectedDoc.confidence ? `${Math.round(selectedDoc.confidence * 100)}%` : 'N/A'} ·{' '}
                    {selectedDoc.isAuthentic ? 'Authentic' : 'Tamper Flagged'}
                  </p>
                </div>
              </div>

              {/* Summary */}
              {selectedDoc.summary && (
                <div>
                  <h4 className="font-semibold text-navy mb-1">AI Executive Summary</h4>
                  <p className="rounded bg-surface-lowest border border-line p-2.5 text-ink-muted leading-relaxed">
                    {selectedDoc.summary}
                  </p>
                </div>
              )}

              {/* Extracted Entities */}
              {selectedDoc.entities && (
                <div>
                  <h4 className="font-semibold text-navy mb-1">Structured Certificate Entities</h4>
                  <div className="rounded bg-surface-lowest border border-line p-3 font-mono text-[11px] space-y-1">
                    {Object.entries(selectedDoc.entities).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-line/40 py-0.5">
                        <span className="text-ink-faint">{k}:</span>
                        <span className="text-navy font-semibold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw OCR Text */}
              {selectedDoc.rawText && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-navy">Transcribed Verbatim OCR Text</h4>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedDoc.rawText || '');
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] text-saffron-800 hover:underline"
                    >
                      <ClipboardIcon className="h-3 w-3" />
                      <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                    </button>
                  </div>
                  <pre className="max-h-48 overflow-y-auto rounded bg-slate-900 text-slate-200 p-3 font-mono text-[10px] whitespace-pre-wrap">
                    {selectedDoc.rawText}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-line bg-surface-low/50 px-5 py-3">
              <a
                href={selectedDoc.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-navy hover:underline flex items-center gap-1"
              >
                <span>View Original File in Supabase ↗</span>
              </a>
              <button
                onClick={() => setSelectedDoc(null)}
                className="rounded bg-navy px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
