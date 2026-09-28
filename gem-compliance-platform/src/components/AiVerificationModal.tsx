'use client';

import { useState, useEffect } from 'react';
import { CheckIcon, SparkIcon, ShieldCheckIcon } from '@/components/icons';

interface Props {
  isOpen: boolean;
  bidderName?: string;
  isComplete: boolean;
  onClose: () => void;
}

interface Step {
  id: number;
  phase: string;
  title: string;
  detail: string;
  tier: string;
  tag: string;
}

const STEPS: Step[] = [
  {
    id: 1,
    phase: 'PHASE 1',
    title: 'Deterministic Mathematical Checksums',
    detail: 'Executing Mod-36 polynomial Luhn algorithm on GSTIN & Section 139A syntax on PAN…',
    tier: 'TIER 1',
    tag: '100% Deterministic',
  },
  {
    id: 2,
    phase: 'PHASE 2',
    title: 'Multimodal Neural Vision & OCR Analysis',
    detail: 'Inspecting uploaded PDF certificates, extracting reseller authorization intent & scanning for clerical anomalies…',
    tier: 'TIER 2',
    tag: 'Vision AI',
  },
  {
    id: 3,
    phase: 'PHASE 3',
    title: 'Statutory Registry & CVC Vigilance Cross-Check',
    detail: 'Querying CVC debarment register, verifying MSME Udyam classification & DPIIT Make-in-India thresholds…',
    tier: 'TIER 3',
    tag: 'Statutory Rules',
  },
  {
    id: 4,
    phase: 'PHASE 4',
    title: 'Generative AI Risk & Recommendation Synthesis',
    detail: 'Synthesizing multi-factor statutory vectors into executive plain-language recommendation & tamper-proof audit trail…',
    tier: 'TIER 4',
    tag: 'LLM Synthesis',
  },
];

export function AiVerificationModal({ isOpen, bidderName, isComplete, onClose }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setProgress(15);
      return;
    }

    // Step progression animation while verifying
    const timer1 = setTimeout(() => {
      setCurrentStepIndex(1);
      setProgress(40);
    }, 1200);

    const timer2 = setTimeout(() => {
      setCurrentStepIndex(2);
      setProgress(70);
    }, 2500);

    const timer3 = setTimeout(() => {
      setCurrentStepIndex(3);
      setProgress(90);
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isComplete) {
      setCurrentStepIndex(4);
      setProgress(100);
    }
  }, [isComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-line bg-surface-lowest p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-saffron/15 text-saffron-800">
                <SparkIcon className="h-4 w-4" />
              </span>
              <span className="rounded bg-saffron/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-saffron-800">
                Live AI Verification Engine
              </span>
              <span className="rounded bg-indiagreen/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-indiagreen-700">
                GeM SIH26100
              </span>
            </div>
            <h3 className="mt-1.5 font-heading text-lg font-bold text-navy">
              {isComplete ? 'Verification Complete' : 'AI Evaluating Bidder Compliance…'}
            </h3>
            {bidderName && (
              <p className="font-mono text-xs text-ink-muted">
                Target: <span className="font-semibold text-navy">{bidderName}</span>
              </p>
            )}
          </div>

          {/* Status Badge */}
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              isComplete
                ? 'bg-indiagreen/15 text-indiagreen-700'
                : 'bg-navy/10 text-navy animate-pulse'
            }`}
          >
            {isComplete ? 'Analysis Finished' : 'Processing Pipeline…'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-ink-muted mb-1">
            <span>Verification Pipeline Progress</span>
            <span className="font-mono font-bold text-navy">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-low">
            <div
              className="h-full bg-gradient-to-r from-navy via-saffron-600 to-indiagreen transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step-by-Step Live Telemetry */}
        <div className="mt-5 space-y-3">
          {STEPS.map((step, idx) => {
            const isDone = isComplete || currentStepIndex > idx;
            const isCurrent = !isComplete && currentStepIndex === idx;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 rounded-xl border p-3 transition-all duration-300 ${
                  isCurrent
                    ? 'border-saffron/40 bg-saffron/5 shadow-xs ring-1 ring-saffron/20'
                    : isDone
                    ? 'border-line bg-surface-lowest'
                    : 'border-line/40 bg-surface-low/50 opacity-40'
                }`}
              >
                {/* Step Icon */}
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indiagreen text-white">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                  ) : isCurrent ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-saffron border-t-transparent animate-spin" />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-[10px] font-mono text-ink-faint">
                      {step.id}
                    </span>
                  )}
                </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-ink-faint uppercase">
                      {step.phase} · {step.tier}
                    </span>
                    <span className="rounded bg-surface-container px-1.5 py-0.2 font-mono text-[9px] font-semibold text-ink-muted">
                      {step.tag}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-navy mt-0.5">{step.title}</h4>
                  <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Success or Action footer */}
        <div className="mt-5 flex items-center justify-between pt-4 border-t border-line">
          <div className="flex items-center gap-1.5 text-xs text-ink-faint">
            <ShieldCheckIcon className="h-4 w-4 text-indiagreen-700" />
            <span>Zero-Trust Verification Audit Logged</span>
          </div>

          <button
            type="button"
            disabled={!isComplete}
            onClick={onClose}
            className={`rounded-lg px-4 py-2 text-xs font-semibold shadow-xs transition-all ${
              isComplete
                ? 'bg-navy text-white hover:bg-navy-700 active:scale-95'
                : 'bg-surface-low text-ink-faint cursor-not-allowed'
            }`}
          >
            {isComplete ? 'View Updated Dossier →' : 'Verifying…'}
          </button>
        </div>
      </div>
    </div>
  );
}
