/**
 * Shared in-memory state for the Storage auto-import watcher.
 *
 * Written by the watcher (autoImport.ts, started from instrumentation.ts or
 * lazily from the status API route) and read by the /api/auto-import/status
 * route that the on-screen panel polls. One Node process (local dev / a
 * single server instance) - not durable, not shared across instances, which
 * is fine: it's a live activity feed, the real record is the ImportBatch table.
 */

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'off';

export interface AutoImportLogEntry {
  at: string; // ISO
  filename: string;
  // 'auto-deleted' = the source file for a spreadsheet import vanished from
  // the bucket, so its bidders + everything attached were removed automatically.
  outcome: 'imported' | 'ignored' | 'skipped' | 'error' | 'auto-deleted';
  detail: string;
  recordsCreated?: number;
  documentsAttached?: number;
  importBatchId?: string;
  via: 'realtime' | 'poll' | 'manual';
}

interface AutoImportState {
  watcherStarted: boolean;
  realtime: RealtimeStatus;
  realtimeLastEventAt: string | null;
  lastPollAt: string | null;
  lastPollFoundNew: number;
  pollIntervalMs: number;
  scanning: boolean;
  processedPaths: string[]; // storagePaths this process has already acted on
  log: AutoImportLogEntry[]; // newest first, capped
}

const MAX_LOG = 40;

// Survive Next dev's module re-evaluation by hanging state off globalThis.
const g = globalThis as unknown as { __gemAutoImportState?: AutoImportState };

export const autoImportState: AutoImportState =
  g.__gemAutoImportState ??
  (g.__gemAutoImportState = {
    watcherStarted: false,
    realtime: 'off',
    realtimeLastEventAt: null,
    lastPollAt: null,
    lastPollFoundNew: 0,
    pollIntervalMs: 9000,
    scanning: false,
    processedPaths: [],
    log: [],
  });

export function pushLog(entry: AutoImportLogEntry) {
  autoImportState.log.unshift(entry);
  if (autoImportState.log.length > MAX_LOG) autoImportState.log.length = MAX_LOG;
}

export function markProcessed(path: string) {
  if (!autoImportState.processedPaths.includes(path)) autoImportState.processedPaths.push(path);
}
