import Link from 'next/link';
import { prisma } from '@/lib/db';
import { importSecretOk } from '@/lib/import/adminGate';
import { listDatasetFiles, downloadDatasetFile, DATASET_BUCKET } from '@/lib/supabaseStorage';
import { readImportFile } from '@/lib/import/readImportFile';
import { committableTenders, recordEntries, bidderDocumentEntries } from '@/lib/import/commit';
import { REQUIRED_TENDER_FIELDS, type ImportReview, type TenderEntry } from '@/lib/import/types';
import { ImportReviewForm } from './ImportReviewForm';
import { AutoImportPanel } from '@/components/AutoImportPanel';

export const dynamic = 'force-dynamic';

const TENDER_FIELD_ORDER = [
  'referenceNo',
  'title',
  'organization',
  'department',
  'category',
  'documentDated',
  'bidEndsAt',
  'emdRequired',
  'emdNote',
  'miiNote',
  'mseNote',
] as const;

function NotFound() {
  return <span className="badge badge-warning">not found in document</span>;
}

function SecretGate({ error }: { error?: string }) {
  return (
    <div className="mx-auto max-w-sm">
      <div className="card">
        <h1 className="font-heading text-h2 text-navy">Dataset import — team tool</h1>
        <p className="mb-4 mt-1 text-sm text-ink-muted">
          Backstage setup utility. Not part of the demoed app. Enter the shared secret.
        </p>
        <form method="GET" className="space-y-3">
          <input
            type="password"
            name="secret"
            required
            autoFocus
            placeholder="ADMIN_IMPORT_SECRET"
            className="field"
          />
          <button type="submit" className="btn-primary w-full">
            Unlock
          </button>
          {error && <p className="text-xs text-critical">{error}</p>}
        </form>
      </div>
    </div>
  );
}

function TenderReview({ entry }: { entry: TenderEntry }) {
  const x = entry.extraction as unknown as Record<string, unknown>;
  return (
    <div className="card p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">{entry.filename}</span>
        <span className="badge badge-neutral">tender document</span>
        {entry.blockers.length > 0 ? (
          <span className="badge badge-critical">
            cannot import — missing: {entry.blockers.join(', ')}
          </span>
        ) : (
          <span className="badge badge-success">ready to import</span>
        )}
      </div>
      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {TENDER_FIELD_ORDER.map((f) => {
          const v = x[f];
          const req = (REQUIRED_TENDER_FIELDS as readonly string[]).includes(f);
          return (
            <div key={f} className="border-b border-line py-1">
              <dt className="text-xs font-medium text-ink-faint">
                {f}
                {req && <span className="text-critical"> *</span>}
              </dt>
              <dd className="text-ink">
                {v === null || v === undefined ? <NotFound /> : String(v)}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-2 text-[11px] text-ink-faint">
        * required. A field not clearly stated in the source PDF is left as &quot;not found&quot; — never guessed. An imported
        tender gets the baseline GST / PAN / blacklist / EPFO / DigiLocker requirement set; tender-specific rows (OEM,
        Udyam %, MII %) are added later by an officer.
      </p>
    </div>
  );
}

async function FileReview({ path, secret }: { path: string; secret: string }) {
  let review: ImportReview;
  try {
    const buf = await downloadDatasetFile(path);
    review = await readImportFile(path, buf);
  } catch (err) {
    return (
      <div className="rounded-xl border border-critical/40 bg-critical/5 p-4 text-sm text-critical">
        Could not read <strong>{path}</strong>: {err instanceof Error ? err.message : String(err)}
      </div>
    );
  }

  const tenders = committableTenders(review);
  const records = recordEntries(review);
  const bidderDocs = bidderDocumentEntries(review);
  const anyRecords = records.some((r) => r.extraction.records.length > 0);
  const canCommit = tenders.length > 0 || anyRecords || bidderDocs.length > 0;
  const canReplaceAll = tenders.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-h2 text-navy">Review: {review.sourceFilename}</h2>
        <Link href={`/admin/import?secret=${encodeURIComponent(secret)}`} className="text-sm text-ink-muted transition-colors hover:text-navy hover:underline">
          ← back to file list
        </Link>
      </div>

      {review.warnings.length > 0 && (
        <ul className="list-disc space-y-0.5 rounded-md border border-warning/40 bg-warning/10 p-3 pl-8 text-xs text-warning-fg">
          {review.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      {review.entries.map((entry, i) => {
        if (entry.kind === 'tender') return <TenderReview key={i} entry={entry} />;
        if (entry.kind === 'skipped')
          return (
            <div key={i} className="rounded-xl border border-line bg-surface-low p-4 text-sm text-ink-muted">
              <span className="font-medium text-ink">{entry.filename}</span> — skipped: {entry.reason}
            </div>
          );
        if (entry.kind === 'bidderDocument')
          return (
            <div key={i} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">{entry.filename}</span>
                <span className="badge badge-neutral">bidder document · {entry.docType}</span>
                <span className="badge badge-neutral">{Math.round(entry.sizeBytes / 1024)} KB</span>
                <span className="badge badge-neutral">
                  {entry.source === 'manifest' ? 'from manifest.json' : 'inferred from filename'}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Will attach to the bidder with company slug &quot;<strong>{entry.companySlug}</strong>&quot; on{' '}
                {entry.tenderReferenceNo ? (
                  <>tender <strong>{entry.tenderReferenceNo}</strong></>
                ) : (
                  <>whichever single tender that slug bids on (ambiguous if more than one)</>
                )}{' '}
                — that bidder must already exist (import its spreadsheet first).
              </p>
            </div>
          );
        // records
        const rec = entry.extraction;
        return (
          <div key={i} className="card p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">{entry.filename}</span>
              <span className="badge badge-neutral">
                bidder records · {rec.records.length} row(s)
              </span>
            </div>
            {rec.matchedColumns.length > 0 && (
              <p className="mb-2 text-[11px] text-ink-muted">Matched columns: {rec.matchedColumns.join(' · ')}</p>
            )}
            {rec.records.length === 0 ? (
              <p className="text-sm text-ink-muted">No usable rows.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="text-ink-faint">
                    <tr>
                      {['name', 'companySlug', 'tenderReferenceNo', 'gstin', 'pan', 'udyamNumber', 'claimedTurnoverInrLakh', 'claimedEmployeeCount'].map((h) => (
                        <th key={h} className="px-2 py-1 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rec.records.map((r, j) => (
                      <tr key={j} className="border-t border-line">
                        {(['name', 'companySlug', 'tenderReferenceNo', 'gstin', 'pan', 'udyamNumber', 'claimedTurnoverInrLakh', 'claimedEmployeeCount'] as const).map((k) => (
                          <td key={k} className="px-2 py-1 text-ink">
                            {r[k] === null ? <NotFound /> : String(r[k])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <ImportReviewForm
        secret={secret}
        reviewJson={JSON.stringify(review)}
        canCommit={canCommit}
        canReplaceAll={canReplaceAll}
      />
    </div>
  );
}

export default async function AdminImportPage({
  searchParams,
}: {
  searchParams: { secret?: string; file?: string };
}) {
  const secret = searchParams.secret ?? '';
  if (!importSecretOk(secret)) {
    return <SecretGate error={secret ? 'Wrong secret.' : undefined} />;
  }

  if (searchParams.file) {
    return (
      <div className="space-y-4">
        <p className="rounded bg-navy px-3 py-1.5 text-xs font-medium text-white">
          Backstage tool — not part of the demoed app flow.
        </p>
        <FileReview path={searchParams.file} secret={secret} />
      </div>
    );
  }

  let files: Awaited<ReturnType<typeof listDatasetFiles>> = [];
  let listError: string | null = null;
  try {
    files = await listDatasetFiles();
  } catch (err) {
    listError = err instanceof Error ? err.message : String(err);
  }

  const batches = await prisma.importBatch.findMany({
    orderBy: { processedAt: 'desc' },
    include: { _count: { select: { tenders: true } } },
  });
  const byPath = new Map(batches.map((b) => [b.storagePath, b]));

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 inline-block rounded bg-navy px-3 py-1.5 text-xs font-medium text-white">
          Backstage tool — not part of the demoed app flow.
        </p>
        <h1 className="font-heading text-h1 text-navy">Dataset import</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Files a team member dropped into the <code className="rounded bg-surface-container px-1 font-mono text-xs">{DATASET_BUCKET}</code>{' '}
          Supabase Storage bucket. Drop a file in via the dashboard and it&apos;s auto-imported (add mode) within seconds —
          or use the manual review-and-commit flow below.
        </p>
      </div>

      <AutoImportPanel secret={secret} />

      {listError && (
        <div className="rounded-xl border border-critical/40 bg-critical/5 p-4 text-sm text-critical">
          Could not list the bucket: {listError}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-surface text-label uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {files.length === 0 && !listError && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-sm text-ink-muted">
                    The bucket is empty. Add a dataset file through the Supabase dashboard, then reload.
                  </td>
                </tr>
              )}
              {files.map((f) => {
                const done = byPath.get(f.path);
                return (
                  <tr key={f.path} className="border-t border-line align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{f.name}</div>
                      <div className="text-xs text-ink-faint">{f.mimeType}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{f.sizeBytes != null ? `${Math.round(f.sizeBytes / 1024)} KB` : '—'}</td>
                    <td className="px-4 py-3">
                      {done ? (
                        <span className="badge badge-success">
                          processed · {done.recordsCreated} record(s) · {new Date(done.processedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="badge badge-warning">new</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/import?secret=${encodeURIComponent(secret)}&file=${encodeURIComponent(f.path)}`}
                        className="text-sm font-medium text-navy hover:underline"
                      >
                        {done ? 'Re-review →' : 'Review →'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {batches.length > 0 && (
        <div>
          <h2 className="mb-2 text-label uppercase tracking-wide text-ink-muted">Import history</h2>
          <ul className="space-y-2 text-xs text-ink-muted">
            {batches.map((b) => (
              <li key={b.id} className="rounded-md border border-line bg-surface-lowest p-3">
                <span className="font-medium text-ink">{b.filename}</span> · {b.mode} · {b.recordsCreated} record(s) ·{' '}
                {b._count.tenders} tender(s) · {new Date(b.processedAt).toLocaleString()} · by {b.processedBy}
                {b.summary && <div className="mt-1 text-ink-faint">{b.summary}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
