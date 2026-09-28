'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { batchRunVerification } from '@/lib/actions';
import { SparkIcon, CheckIcon, AlertTriangleIcon } from '@/components/icons';

export function BatchVerifyButton({
  tenderId,
  bidderCount,
  disabled = false,
  disabledReason,
}: {
  tenderId: string;
  bidderCount: number;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  async function handleBatchVerify() {
    if (running || disabled) return;
    setRunning(true);
    setError(null);
    setCompleted(false);

    try {
      setStep('1/4: Ingesting & OCRing documents for all bidders…');
      await new Promise((r) => setTimeout(r, 400));

      setStep('2/4: Running Mod-36 checksums & PAN structural validation…');
      await new Promise((r) => setTimeout(r, 400));

      setStep('3/4: Cross-referencing CVC Debarment & Udyam Registries…');
      await batchRunVerification(tenderId);

      setStep('4/4: Synthesizing AI compliance scores & recommendations…');
      await new Promise((r) => setTimeout(r, 300));

      setCompleted(true);
      router.refresh();
      setTimeout(() => {
        setRunning(false);
        setCompleted(false);
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Batch verification failed.');
      setRunning(false);
    }
  }

  if (disabled) {
    return (
      <span className="text-xs text-ink-faint italic" title={disabledReason}>
        {disabledReason || 'Batch verification unavailable.'}
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleBatchVerify}
        disabled={running}
        className="btn-primary text-xs py-2 px-3.5 flex items-center gap-2 shadow-sm font-semibold hover:shadow transition-all"
        title="Automatically run multimodal extraction, rules engine & AI scoring across all bidders"
      >
        {running ? (
          <>
            <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            <span>Processing Batch…</span>
          </>
        ) : completed ? (
          <>
            <CheckIcon className="h-3.5 w-3.5 text-white" />
            <span>Batch Verification Complete!</span>
          </>
        ) : (
          <>
            <SparkIcon className="h-3.5 w-3.5 text-saffron-300" />
            <span>1-Click Batch Verify ({bidderCount} Bidders)</span>
          </>
        )}
      </button>

      {/* Progress Feedback Dropdown */}
      {running && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-line bg-surface-lowest p-3 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between text-[11px] font-semibold text-navy mb-1.5">
            <span>Automated AI Pipeline</span>
            <span className="text-saffron-800 font-mono">Running</span>
          </div>
          <div className="h-1.5 w-full bg-surface-low rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-saffron via-navy to-indiagreen animate-pulse w-full" />
          </div>
          <p className="text-[11px] text-ink-muted leading-tight">{step}</p>
        </div>
      )}

      {error && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-critical/30 bg-critical/10 p-2.5 text-xs text-critical z-50">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangleIcon className="h-3.5 w-3.5" />
            <span>Batch Run Error</span>
          </div>
          <p className="mt-1 text-[11px]">{error}</p>
        </div>
      )}
    </div>
  );
}
