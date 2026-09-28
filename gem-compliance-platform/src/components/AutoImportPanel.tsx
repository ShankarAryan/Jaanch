'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type LogEntry = {
  at: string;
  filename: string;
  outcome: 'imported' | 'ignored' | 'skipped' | 'error' | 'auto-deleted';
  detail: string;
  recordsCreated?: number;
  documentsAttached?: number;
  importBatchId?: string;
  via: 'realtime' | 'poll' | 'manual';
};

type Status = {
  bucket: string;
  watcherStarted: boolean;
  realtime: 'connecting' | 'connected' | 'disconnected' | 'error' | 'off';
  realtimeLastEventAt: string | null;
  lastPollAt: string | null;
  lastPollFoundNew: number;
  pollIntervalMs: number;
  scanning: boolean;
  log: LogEntry[];
};

const outcomeStyle: Record<LogEntry['outcome'], string> = {
  imported: 'bg-indiagreen/10 text-indiagreen-700',
  ignored: 'bg-surface-high text-ink-faint',
  skipped: 'bg-warning/15 text-warning-fg',
  error: 'bg-critical/10 text-critical',
  'auto-deleted': 'bg-critical text-white',
};

const rtDot: Record<Status['realtime'], string> = {
  connected: 'bg-indiagreen',
  connecting: 'bg-warning',
  disconnected: 'bg-ink-faint',
  error: 'bg-critical',
  off: 'bg-line',
};

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString() : '—');

export function AutoImportPanel({ secret }: { secret: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`/api/auto-import/status?secret=${encodeURIComponent(secret)}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`status ${r.status}`);
      setStatus(await r.json());
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [secret]);

  useEffect(() => {
    poll();
    timer.current = setInterval(poll, 4000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [poll]);

  const scanNow = async () => {
    setScanning(true);
    try {
      await fetch(`/api/auto-import/scan?secret=${encodeURIComponent(secret)}`, { method: 'POST' });
      await poll();
    } finally {
      setScanning(false);
    }
  };

  const rt = status?.realtime ?? 'connecting';
  const log = status?.log ?? [];
  const imports = log.filter((e) => e.outcome === 'imported').length;
  const autoDeletes = log.filter((e) => e.outcome === 'auto-deleted').length;

  return (
    <div className="rounded-xl border border-navy/30 bg-surface-lowest p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full ${rtDot[rt]} ${rt === 'connected' ? 'animate-ping opacity-60' : ''}`} />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${rtDot[rt]}`} />
          </span>
          <span className="text-sm font-semibold text-ink">
            Watching <code className="rounded bg-surface-container px-1 font-mono text-xs">{status?.bucket ?? 'dataset-uploads'}</code> for new files
          </span>
        </div>
        <button
          type="button"
          onClick={scanNow}
          disabled={scanning}
          className="btn-secondary text-xs"
        >
          {scanning ? 'Scanning…' : 'Scan now'}
        </button>
      </div>

      <div className="mt-2 grid gap-x-6 gap-y-1 text-[11px] text-ink-muted sm:grid-cols-2">
        <div>
          Realtime: <span className="font-medium text-ink">{rt}</span>
          {status?.realtimeLastEventAt && <> · last event {time(status.realtimeLastEventAt)}</>}
        </div>
        <div>
          Poll fallback: every {Math.round((status?.pollIntervalMs ?? 9000) / 1000)}s · last {time(status?.lastPollAt ?? null)}
          {status?.scanning && <span className="ml-1 text-navy">(scanning…)</span>}
        </div>
        <div>
          Auto-imports this session: <span className="font-medium text-ink">{imports}</span>
          {autoDeletes > 0 && (
            <span className="ml-2 font-medium text-critical">· {autoDeletes} auto-removed (source file deleted)</span>
          )}
        </div>
        <div>{err ? <span className="text-critical">status error: {err}</span> : 'Drop a .xlsx or manifest .zip straight into the bucket — no upload here needed. Delete the file and its bidders are removed automatically.'}</div>
      </div>

      <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-line">
        {log.length === 0 ? (
          <p className="p-3 text-xs text-ink-faint">No activity yet. Waiting for a file to land in the bucket…</p>
        ) : (
          <ul className="divide-y divide-line text-xs">
            {log.map((e, i) => (
              <li
                key={i}
                className={`flex flex-wrap items-center gap-x-2 gap-y-1 p-2 ${e.outcome === 'auto-deleted' ? 'bg-critical/5' : ''}`}
              >
                <span className="font-mono text-[10px] text-ink-faint">{time(e.at)}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${outcomeStyle[e.outcome]}`}>{e.outcome}</span>
                <span className="rounded bg-surface-container px-1.5 py-0.5 text-[10px] text-ink-muted">{e.via}</span>
                <span className="font-medium text-ink">{e.filename}</span>
                {e.outcome !== 'auto-deleted' && e.recordsCreated != null && <span className="text-ink-muted">· {e.recordsCreated} record(s)</span>}
                {e.documentsAttached != null && <span className="text-ink-muted">· {e.documentsAttached} doc(s)</span>}
                <span className={`w-full ${e.outcome === 'auto-deleted' ? 'font-medium text-critical' : 'text-ink-muted'}`}>{e.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
