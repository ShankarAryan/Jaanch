'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { runVerification } from '@/lib/actions';
import { AiVerificationModal } from '@/components/AiVerificationModal';
import { SparkIcon } from '@/components/icons';

export function VerifyButton({
  bidderId,
  bidderName,
  label = 'Run Verification',
  disabledReason,
  compact = false,
}: {
  bidderId: string;
  bidderName?: string;
  label?: string;
  /** When set, the button is inert and this hint is shown (e.g. viewer role). */
  disabledReason?: string;
  /** In dense contexts (a table row) skip the hint text; keep the tooltip. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsPending(true);
    setShowModal(true);
    setIsComplete(false);
    setError(null);
    try {
      await runVerification(bidderId);
      setIsComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed — try again.');
      setShowModal(false);
    } finally {
      setIsPending(false);
    }
  }

  function handleCloseModal() {
    setShowModal(false);
    setIsComplete(false);
    router.refresh();
  }

  if (disabledReason) {
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <button type="button" disabled title={disabledReason} className="btn-primary opacity-40">
          {label}
        </button>
        {!compact && <span className="max-w-[16rem] text-right text-[11px] text-ink-faint">{disabledReason}</span>}
      </span>
    );
  }

  return (
    <>
      <span className="inline-flex flex-col items-end gap-1">
        <button
          type="button"
          disabled={isPending}
          onClick={handleClick}
          className="btn-primary inline-flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all active:scale-95"
        >
          {isPending ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
          ) : (
            <SparkIcon className="h-3.5 w-3.5 text-white/90" />
          )}
          <span>{isPending ? 'Verifying with AI…' : label}</span>
        </button>
        {isPending && <span className="text-[11px] text-saffron-800 font-medium animate-pulse">Running AI Pipeline…</span>}
        {error && <span className="max-w-[16rem] text-right text-[11px] text-critical">{error}</span>}
      </span>

      {/* Interactive AI Verification Pipeline HUD Modal */}
      <AiVerificationModal
        isOpen={showModal}
        bidderName={bidderName}
        isComplete={isComplete}
        onClose={handleCloseModal}
      />
    </>
  );
}
