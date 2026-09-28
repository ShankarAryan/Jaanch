import 'server-only';
import AdmZip from 'adm-zip';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';
import { DATASET_BUCKET, downloadDatasetFile } from '@/lib/supabaseStorage';
import { readImportFile } from './readImportFile';
import { commitImport } from './commit';
import { autoImportState, pushLog, markProcessed, type AutoImportLogEntry } from './autoImportState';

/**
 * Storage auto-import: a second path into the import pipeline that needs no
 * /admin/import click. When a file lands in the "dataset-uploads" bucket
 * (dropped straight into Supabase Storage), a Realtime INSERT event on
 * storage.objects - or the polling fallback - triggers the SAME
 * commitImport() the manual flow uses, in ADD MODE ONLY. Never replace-all
 * (destructive, and there's no human here to choose it). Never auto-commits
 * a tender PDF (its extracted fields need human review at /admin/import).
 */

// File extensions the manual flow accepts that are safe to auto-commit
// without a review step: bidder spreadsheets and bidder-document ZIPs
// (manifest.json-driven, or targets inferred from each PDF's filename).
const AUTO_EXTS = new Set(['xlsx', 'xls', 'csv', 'zip']);
const PROCESSED_BY = 'auto-import (storage watcher)';

const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

// All mutable watcher state lives on one globalThis-backed singleton so a
// Next dev HMR re-evaluation of this module reuses the SAME timer / channel /
// mutex rather than forking a second, uncoordinated watcher.
interface Runtime {
  chain: Promise<unknown>;
  locked: boolean;
  supabaseClient: SupabaseClient | null;
  channel: RealtimeChannel | null;
  pollTimer: NodeJS.Timeout | null;
  realtimeMuted: boolean;
}
const g = globalThis as unknown as { __gemAutoImportRuntime?: Runtime };
const rt: Runtime =
  g.__gemAutoImportRuntime ??
  (g.__gemAutoImportRuntime = {
    chain: Promise.resolve(),
    locked: false,
    supabaseClient: null,
    channel: null,
    pollTimer: null,
    realtimeMuted: false,
  });

// Promise-chain mutex - a plain boolean has a check-then-set race across the
// await points inside a run (two triggers can both pass the check and then
// both commit the same file). withLock() serialises; tryLock() skips if busy.
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = rt.chain.then(() => {
    rt.locked = true;
    autoImportState.scanning = true;
    return fn();
  });
  rt.chain = run.then(
    () => { rt.locked = false; autoImportState.scanning = false; },
    () => { rt.locked = false; autoImportState.scanning = false; },
  );
  return run;
}
function tryLock<T>(fn: () => Promise<T>): Promise<T | null> {
  if (rt.locked) return Promise.resolve(null);
  return withLock(fn);
}

/**
 * storagePaths that count as "already imported" - idempotency across
 * reconnects / restarts. A reverted batch (revertedAt set: its source file
 * was deleted and its bidders auto-wiped) is excluded, so re-uploading a file
 * under that same name is treated as new and imported again into a fresh
 * ImportBatch row. The old reverted row stays as history.
 */
async function committedPaths(): Promise<Set<string>> {
  const docCount = await prisma.document.count();
  const rows = await prisma.importBatch.findMany({
    where: {
      revertedAt: null,
      OR: [
        { recordsCreated: { gt: 0 } },
        ...(docCount > 0 ? [{ summary: { contains: 'document(s) attached' } }] : []),
      ],
    },
    select: { storagePath: true },
  });
  return new Set(rows.map((r) => r.storagePath));
}

/**
 * Enumerates the bucket by querying storage.objects directly. The Storage
 * list() HTTP endpoint serves a short-lived cached response and can omit a
 * just-uploaded object for many seconds - the DB row is the source of truth
 * and appears the instant the upload commits (same row the Realtime INSERT
 * fires on). Root-level files only, matching listDatasetFiles().
 */
async function bucketObjectNames(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ name: string }[]>`
    SELECT name FROM storage.objects
    WHERE bucket_id = ${DATASET_BUCKET} AND name <> '.emptyFolderPlaceholder' AND position('/' in name) = 0
  `;
  return rows.map((r) => r.name);
}

/**
 * Live existence check - the reliable replacement for snapshot diffing. For
 * every ImportBatch, is its storagePath still in the current bucket listing?
 * If not, and that batch still has bidders tagged with its id, the source
 * file is gone: run the cascade for it immediately (no confirm). Because this
 * checks live state every tick with no memory of prior ticks, it also catches
 * a deletion that happened while the watcher was down / before it started -
 * the exact case the old "seen last tick, gone this tick" approach missed.
 */
async function purgeDeletedImports(currentNames: string[]): Promise<void> {
  const present = new Set(currentNames);
  // Only batches not already reverted - a second pass over an already-reverted
  // one is a guaranteed no-op (its bidders are gone) so there's no point, and
  // it keeps the "0 live bidders" guard below from ever firing on one.
  const batches = await prisma.importBatch.findMany({ where: { revertedAt: null }, select: { id: true, storagePath: true } });

  for (const batch of batches) {
    if (present.has(batch.storagePath)) continue; // source file still there
    // eslint-disable-next-line no-await-in-loop
    const bidderCount = await prisma.bidder.count({ where: { importBatchId: batch.id } });
    if (bidderCount === 0) continue; // nothing this batch created is still live
    // eslint-disable-next-line no-await-in-loop
    await cascadeDeleteImport(batch.id);
  }
}

/**
 * Pushes one panel line per item, capped so a large ZIP where every PDF is
 * mis-named (or every bidder is missing) doesn't bury the rest of the feed.
 */
function logCapped(
  zipName: string,
  items: { file: string; detail: string }[],
  outcome: AutoImportLogEntry['outcome'],
  via: AutoImportLogEntry['via'],
  importBatchId?: string,
  cap = 8,
): void {
  if (items.length === 0) return;
  for (const it of items.slice(0, cap)) {
    pushLog({ at: new Date().toISOString(), filename: `${zipName} › ${it.file}`, outcome, detail: it.detail, via, importBatchId });
  }
  if (items.length > cap) {
    pushLog({
      at: new Date().toISOString(),
      filename: zipName,
      outcome,
      detail: `…and ${items.length - cap} more ${outcome === 'imported' ? 'attached' : 'skipped'} — see /admin/import for the full list.`,
      via,
      importBatchId,
    });
  }
}

async function processOneFile(name: string, via: AutoImportLogEntry['via'], done: Set<string>): Promise<void> {
  const ext = extOf(name);
  const base = { at: new Date().toISOString(), filename: name, via };

  if (!AUTO_EXTS.has(ext)) {
    pushLog({ ...base, outcome: 'ignored', detail: `.${ext || '?'} is not a bidder spreadsheet or dataset ZIP — left for a manual review at /admin/import.` });
    markProcessed(name);
    return;
  }
  if (done.has(name)) return; // already an ImportBatch for this path

  let buffer: Buffer;
  try {
    buffer = await downloadDatasetFile(name);
  } catch (err) {
    pushLog({ ...base, outcome: 'error', detail: `download failed: ${err instanceof Error ? err.message : String(err)}` });
    return;
  }

  // A ZIP is auto-imported when it's a bidder-document bundle: either it
  // carries a manifest.json at its root (the manifest routes each PDF straight
  // to a Document row), or it has no manifest and each PDF's target is inferred
  // from its <companySlug>__<doctype>.pdf path (readImportFile). A ZIP that
  // still yields tender document(s) - a manifest ZIP with unlisted PDFs - is
  // left for a human review at /admin/import (the hasTender check below).
  if (ext === 'zip') {
    try {
      new AdmZip(buffer);
    } catch (err) {
      pushLog({ ...base, outcome: 'error', detail: `not a readable ZIP: ${err instanceof Error ? err.message : String(err)}` });
      return;
    }
  }

  let review;
  try {
    review = await readImportFile(name, buffer);
  } catch (err) {
    pushLog({ ...base, outcome: 'error', detail: `parse failed: ${err instanceof Error ? err.message : String(err)}` });
    return;
  }

  // One panel line per PDF that couldn't be auto-matched to a bidder from its
  // filename (bad naming / unknown keyword) - with the rename hint, so it's
  // clear exactly what to fix. One bad name never blocks the rest of the ZIP.
  // Capped so a large all-mismatched ZIP doesn't flood the feed.
  logCapped(
    name,
    review.entries.filter((e) => e.kind === 'skipped' && e.filename !== name).map((e) => ({ file: (e as { filename: string }).filename, detail: (e as { reason: string }).reason })),
    'skipped',
    via,
  );

  const hasTender = review.entries.some((e) => e.kind === 'tender');
  if (hasTender) {
    pushLog({ ...base, outcome: 'skipped', detail: 'contains tender document(s) — extracted fields need a human review, open it at /admin/import.' });
    markProcessed(name);
    return;
  }
  const hasRecords = review.entries.some((e) => e.kind === 'records' && e.extraction.records.length > 0);
  const hasBidderDocs = review.entries.some((e) => e.kind === 'bidderDocument');
  if (!hasRecords && !hasBidderDocs) {
    pushLog({ ...base, outcome: 'skipped', detail: 'no bidder rows and no auto-matchable documents found in the file.' });
    markProcessed(name);
    return;
  }

  try {
    const result = await commitImport(review, 'add', PROCESSED_BY);

    // One panel line per document the commit resolved (attached) or couldn't
    // (duplicate / ambiguous / bidder-not-yet-imported), capped for big ZIPs.
    logCapped(
      name,
      result.documentResults.filter((d) => d.outcome === 'attached').map((d) => ({ file: d.file, detail: d.detail })),
      'imported',
      via,
      result.importBatchId || undefined,
    );
    logCapped(
      name,
      result.documentResults.filter((d) => d.outcome === 'skipped').map((d) => ({ file: d.file, detail: d.detail })),
      'skipped',
      via,
      result.importBatchId || undefined,
    );

    const attached = result.documentResults.filter((d) => d.outcome === 'attached').length;
    const skipped = result.documentResults.length - attached;
    // A short tally line (the per-file lines above carry the detail; the full
    // text is on the ImportBatch in /admin/import).
    const tally =
      result.documentResults.length > 0
        ? `${attached} document(s) attached, ${skipped} skipped${result.recordsCreated ? `, ${result.recordsCreated} record(s) created` : ''}.`
        : result.summary;
    pushLog({
      ...base,
      outcome: result.importBatchId ? 'imported' : 'skipped',
      detail: tally,
      recordsCreated: result.recordsCreated,
      documentsAttached: attached || undefined,
      importBatchId: result.importBatchId || undefined,
    });
    markProcessed(name);
  } catch (err) {
    pushLog({ ...base, outcome: 'error', detail: `commit failed: ${err instanceof Error ? err.message : String(err)}` });
  }
}

/**
 * Lists the bucket, diffs against ImportBatch.storagePath, and auto-commits
 * every not-yet-imported file that qualifies. Safe to call repeatedly and
 * concurrently (the mutex serialises runs; committed paths are re-checked).
 */
export async function runAutoImport(via: AutoImportLogEntry['via'] = 'poll'): Promise<{ scanned: number; newFiles: number }> {
  const body = async () => {
    // A manual "Scan now" reconsiders every non-committed file; the poll and
    // Realtime paths also skip ones already handled this process run
    const currentDocCount = await prisma.document.count();
    if (via === 'manual' || currentDocCount === 0) autoImportState.processedPaths = [];
    const [names, done] = await Promise.all([bucketObjectNames(), committedPaths()]);

    // Source file for a past import gone from the bucket? Cascade-delete its
    // bidders now, automatically (poll + manual, never Realtime - INSERT-only).
    if (via !== 'realtime') await purgeDeletedImports(names);

    const fresh = names.filter((n) => !done.has(n) && !autoImportState.processedPaths.includes(n));
    if (via === 'poll') {
      autoImportState.lastPollAt = new Date().toISOString();
      autoImportState.lastPollFoundNew = fresh.length;
    }
    for (const n of fresh) {
      // eslint-disable-next-line no-await-in-loop
      await processOneFile(n, via, done);
      done.add(n);
    }
    return { scanned: names.length, newFiles: fresh.length };
  };
  // Poll skips a tick if a run is already in flight (no backlog); manual and
  // realtime-with-no-name queue behind it.
  const res = via === 'poll' ? await tryLock(body) : await withLock(body);
  return res ?? { scanned: 0, newFiles: 0 };
}

/**
 * Processes ONE known path - used by the Realtime handler, which gets the
 * object name straight from the INSERT payload. Storage's list() endpoint can
 * lag a freshly-uploaded object by seconds, so acting on the name directly is
 * how the Realtime path stays fast; the list-based poll is the catch-up.
 */
export async function runAutoImportForPath(name: string, via: AutoImportLogEntry['via']): Promise<void> {
  await withLock(async () => {
    const done = await committedPaths(); // re-checked inside the lock: an
    // earlier queued run for the same file may have committed it already.
    if (!done.has(name) && !autoImportState.processedPaths.includes(name)) {
      await processOneFile(name, via, done);
    }
  });
}

// --- automatic revert cascade ------------------------------------------------

export interface CascadeResult {
  importBatchId: string;
  deleted: { auditLogs: number; decisions: number; scores: number; verificationResults: number; documents: number; bidders: number };
}

/**
 * The cascade - runs automatically the moment purgeDeletedImports() sees the
 * source file is gone. Deletes, in FK-safe order, exactly the bidders tagged
 * with this importBatchId and everything hanging off them. Never touches
 * Tender, never a bidder from another batch or the seed data, and keeps the
 * ImportBatch row as the record that this import happened and was reverted.
 * Pushes an `auto-deleted` log entry so the removal is visible in the panel
 * after the fact - explicitly calling out any officer Decision that was in it,
 * so a real PO call being destroyed is never silent.
 */
export async function cascadeDeleteImport(importBatchId: string): Promise<CascadeResult> {
  const bidders = await prisma.bidder.findMany({
    where: { importBatchId },
    select: { id: true, tender: { select: { title: true } } },
  });
  const ids = bidders.map((b) => b.id);

  if (ids.length === 0) {
    return { importBatchId, deleted: { auditLogs: 0, decisions: 0, scores: 0, verificationResults: 0, documents: 0, bidders: 0 } };
  }

  const tenders = [...new Set(bidders.map((b) => b.tender.title))].sort();
  const batch = await prisma.importBatch.findUnique({ where: { id: importBatchId }, select: { filename: true } });

  const w = { bidderId: { in: ids } };
  const [al, dec, sc, vr, doc, bid] = await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: w }),
    prisma.decision.deleteMany({ where: w }),
    prisma.score.deleteMany({ where: w }),
    prisma.verificationResult.deleteMany({ where: w }),
    prisma.document.deleteMany({ where: w }),
    prisma.bidder.deleteMany({ where: { id: { in: ids } } }),
    // Mark (don't delete) the batch. Frees its storagePath so a re-upload
    // under the same name imports fresh (see committedPaths).
    prisma.importBatch.update({ where: { id: importBatchId }, data: { revertedAt: new Date() } }),
  ]);

  const decisionNote = dec.count > 0 ? ` — INCLUDED ${dec.count} OFFICER DECISION${dec.count === 1 ? '' : 'S'}` : '';
  pushLog({
    at: new Date().toISOString(),
    filename: batch?.filename ?? importBatchId,
    outcome: 'auto-deleted',
    detail:
      `source file gone from Storage — auto-removed ${bid.count} bidder(s) ` +
      `(${tenders.join(', ')}), ${doc.count} document(s), ${sc.count} score(s), ${vr.count} verification result(s), ` +
      `${al.count} audit log(s)${decisionNote}. Tenders kept; ImportBatch row kept and marked reverted (re-uploading this filename will import fresh).`,
    via: 'poll',
    importBatchId,
    recordsCreated: bid.count,
  });

  return {
    importBatchId,
    deleted: { auditLogs: al.count, decisions: dec.count, scores: sc.count, verificationResults: vr.count, documents: doc.count, bidders: bid.count },
  };
}

// --- watcher lifecycle ----------------------------------------------------

function subscribeRealtime(): void {
  if (rt.channel || !rt.supabaseClient) return;
  autoImportState.realtime = 'connecting';
  rt.channel = rt.supabaseClient
    .channel('storage-imports')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'storage', table: 'objects', filter: `bucket_id=eq.${DATASET_BUCKET}` },
      (payload) => {
        if (!rt.channel || rt.realtimeMuted) return; // torn down / muted for a fallback demo
        autoImportState.realtimeLastEventAt = new Date().toISOString();
        const rec = payload.new as { name?: string } | undefined;
        const name = rec?.name;
        const p = name ? runAutoImportForPath(name, 'realtime') : runAutoImport('realtime');
        p.catch((err) => {
          pushLog({ at: new Date().toISOString(), filename: name ?? '(realtime)', outcome: 'error', detail: String(err), via: 'realtime' });
        });
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') autoImportState.realtime = 'connected';
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') autoImportState.realtime = 'error';
      else if (status === 'CLOSED') autoImportState.realtime = 'disconnected';
    });
}

/**
 * Starts (once per process) the Realtime subscription on storage.objects
 * INSERT for the dataset-uploads bucket, plus a polling fallback every ~9s.
 * Idempotent. Called lazily from the /api/auto-import status + scan routes,
 * so the watcher is live from the moment someone opens /admin/import (or
 * hits either route) and stays up for the server process's lifetime.
 * (A Node-runtime instrumentation.ts hook would make it boot-time always-on,
 * but Next 14's instrumentation bundle can't pull in the adm-zip/xlsx import
 * pipeline - so lazy start it is.)
 */
export function ensureAutoImportWatcher(): void {
  if (autoImportState.watcherStarted && rt.pollTimer) return;
  autoImportState.watcherStarted = true;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rt.pollTimer) {
    const tick = () => {
      runAutoImport('poll').catch((err) => {
        pushLog({ at: new Date().toISOString(), filename: '(poll)', outcome: 'error', detail: String(err), via: 'poll' });
      });
    };
    rt.pollTimer = setInterval(tick, autoImportState.pollIntervalMs);
    if (rt.pollTimer.unref) rt.pollTimer.unref();
    tick(); // immediate first scan
  }

  if (!url || !key) {
    autoImportState.realtime = 'off';
    pushLog({ at: new Date().toISOString(), filename: '(watcher)', outcome: 'ignored', detail: 'SUPABASE_URL / SERVICE_ROLE_KEY not set — Realtime off, polling only.', via: 'manual' });
    return;
  }
  if (!rt.supabaseClient) {
    rt.supabaseClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  subscribeRealtime();
}

function tearDownRealtime(): void {
  if (rt.channel) {
    const c = rt.channel;
    rt.channel = null; // null first so the handler guard short-circuits an in-flight event
    rt.supabaseClient?.removeChannel(c).catch(() => {});
  }
  rt.supabaseClient?.realtime.disconnect();
  autoImportState.realtime = 'disconnected';
}

export function stopAutoImportWatcher(): void {
  if (rt.pollTimer) clearInterval(rt.pollTimer);
  rt.pollTimer = null;
  tearDownRealtime();
  autoImportState.watcherStarted = false;
  autoImportState.realtime = 'off';
}

/**
 * Toggle the Realtime path (the polling fallback keeps running regardless).
 * Demonstrates that a dropped Realtime connection doesn't stop auto-import -
 * the ~9s poll still picks the file up. `off` mutes the handler AND tears the
 * socket down; `on` restores both.
 */
export function setRealtimeEnabled(on: boolean): void {
  if (!on) {
    rt.realtimeMuted = true;
    tearDownRealtime();
    return;
  }
  rt.realtimeMuted = false;
  if (rt.channel) return;
  rt.supabaseClient?.realtime.connect();
  subscribeRealtime();
}
