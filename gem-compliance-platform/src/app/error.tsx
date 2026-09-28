'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-xl border border-critical/30 bg-critical/5 p-6 shadow-card">
      <h2 className="font-heading text-h2 text-critical">Something went wrong</h2>
      <p className="mt-1 text-sm text-ink-muted">
        The page hit an unexpected error. This is a demo build — the pipeline itself falls back safely, so retrying
        usually clears it.
      </p>
      {error?.message && (
        <pre className="mt-3 overflow-x-auto rounded bg-surface-lowest p-2 font-mono text-xs text-critical">{error.message}</pre>
      )}
      <div className="mt-4 flex gap-2">
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/dashboard" className="btn-secondary">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
