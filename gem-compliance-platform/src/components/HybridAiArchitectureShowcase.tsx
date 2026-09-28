'use client';

import { useState } from 'react';
import { validateGstin } from '@/lib/validation/gstin';
import { validatePan } from '@/lib/validation/pan';
import { ShieldCheckIcon, CheckIcon, AlertTriangleIcon, SparkIcon, FileIcon } from '@/components/icons';

export function HybridAiArchitectureShowcase() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'lab'>('architecture');
  const [testInput, setTestInput] = useState('27AABCS4321L1ZA');
  const [inputType, setInputType] = useState<'GSTIN' | 'PAN'>('GSTIN');

  const gstinResult = inputType === 'GSTIN' ? validateGstin(testInput) : null;
  const panResult = inputType === 'PAN' ? validatePan(testInput) : null;

  return (
    <div className="rounded-xl border border-line bg-gradient-to-br from-surface-lowest via-surface-lowest to-surface-low p-5 shadow-card">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-saffron/10 text-saffron-800 font-bold text-xs">
              ★
            </span>
            <span className="rounded bg-saffron/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-saffron-800">
              Core Architectural Innovation
            </span>
            <span className="rounded bg-indiagreen/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-indiagreen-700">
              Zero-Hallucination
            </span>
          </div>
          <h2 className="mt-1 font-heading text-lg font-bold text-navy">
            Deterministic-First Hybrid AI Architecture
          </h2>
          <p className="text-xs text-ink-muted">
            Solving public procurement fraud by combining mathematical polynomial checksums, multimodal vision AI, and statutory rules.
          </p>
        </div>

        {/* View Switcher */}
        <div className="inline-flex rounded-lg border border-line bg-surface-lowest p-1 shadow-2xs">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              activeTab === 'architecture'
                ? 'bg-navy text-white shadow-xs'
                : 'text-ink-muted hover:text-navy'
            }`}
          >
            3-Tier Engine Breakdown
          </button>
          <button
            onClick={() => setActiveTab('lab')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              activeTab === 'lab'
                ? 'bg-navy text-white shadow-xs'
                : 'text-ink-muted hover:text-navy'
            }`}
          >
            Live Algorithm Lab
          </button>
        </div>
      </div>

      {/* Tab 1: 3-Tier Engine Architecture */}
      {activeTab === 'architecture' && (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {/* Tier 1 */}
          <div className="flex flex-col justify-between rounded-lg border border-line/80 bg-surface-lowest p-4 transition-all hover:border-saffron/50 hover:shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-navy/10 px-2 py-0.5 font-mono text-[10px] font-bold text-navy">
                  TIER 1 · 100% OFFLINE
                </span>
                <span className="flex h-2 w-2 rounded-full bg-indiagreen" />
              </div>
              <h3 className="mt-2.5 font-heading text-sm font-bold text-navy flex items-center gap-1.5">
                <span>Deterministic Mathematical Algorithms</span>
              </h3>
              <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">
                Executes the government's official <strong>Luhn Mod-36 polynomial checksum</strong> and Income Tax Act Section 139A structural syntax.
              </p>

              <div className="mt-3 space-y-1.5 rounded-md bg-surface-low p-2.5 text-[11px]">
                <div className="flex items-center gap-1.5 text-ink">
                  <CheckIcon className="h-3 w-3 text-indiagreen-700 shrink-0" />
                  <span><strong>Mod-36 Checksum:</strong> Catches fake GSTINs offline</span>
                </div>
                <div className="flex items-center gap-1.5 text-ink">
                  <CheckIcon className="h-3 w-3 text-indiagreen-700 shrink-0" />
                  <span><strong>Embedded PAN Match:</strong> Verifies char 3–12 link</span>
                </div>
                <div className="flex items-center gap-1.5 text-ink">
                  <CheckIcon className="h-3 w-3 text-indiagreen-700 shrink-0" />
                  <span><strong>Zero Hallucination:</strong> 100% mathematical certainty</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-line text-[10px] text-ink-faint">
              Tested on real GeM bidders · Zero external API latency
            </div>
          </div>

          {/* Tier 2 */}
          <div className="flex flex-col justify-between rounded-lg border border-line/80 bg-surface-lowest p-4 transition-all hover:border-saffron/50 hover:shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-saffron/15 px-2 py-0.5 font-mono text-[10px] font-bold text-saffron-800">
                  TIER 2 · VISION & NLP
                </span>
                <SparkIcon className="h-3.5 w-3.5 text-saffron-800" />
              </div>
              <h3 className="mt-2.5 font-heading text-sm font-bold text-navy flex items-center gap-1.5">
                <span>Multimodal Document Intelligence</span>
              </h3>
              <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">
                Analyzes uploaded PDF certificates, extracting semantic intent, manufacturer authorization validity, and cross-document anomalies.
              </p>

              <div className="mt-3 space-y-1.5 rounded-md bg-surface-low p-2.5 text-[11px]">
                <div className="flex items-center gap-1.5 text-ink">
                  <CheckIcon className="h-3 w-3 text-indiagreen-700 shrink-0" />
                  <span><strong>OEM Intent Verification:</strong> Reads reseller rights</span>
                </div>
                <div className="flex items-center gap-1.5 text-ink">
                  <CheckIcon className="h-3 w-3 text-indiagreen-700 shrink-0" />
                  <span><strong>Entity Cross-Check:</strong> Authorised vs Bidder name</span>
                </div>
                <div className="flex items-center gap-1.5 text-ink">
                  <CheckIcon className="h-3 w-3 text-indiagreen-700 shrink-0" />
                  <span><strong>Typo Catch:</strong> Catches <em>Febricators</em> vs <em>Fabricators</em></span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-line text-[10px] text-ink-faint">
              Multimodal Vision AI · Visual & text layout inspection
            </div>
          </div>

          {/* Tier 3 */}
          <div className="flex flex-col justify-between rounded-lg border border-line/80 bg-surface-lowest p-4 transition-all hover:border-saffron/50 hover:shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-indigo/10 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-600">
                  TIER 3 · CAG AUDIT READY
                </span>
                <ShieldCheckIcon className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <h3 className="mt-2.5 font-heading text-sm font-bold text-navy flex items-center gap-1.5">
                <span>Statutory Rules & Policy Engine</span>
              </h3>
              <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">
                Applies tender-specific statutory criteria—CVC debarment, PPP-MSE 2012 purchase preference, and Make-in-India thresholds.
              </p>

              <div className="mt-3 space-y-1.5 rounded-md bg-surface-low p-2.5 text-[11px]">
                <div className="flex items-center gap-1.5 text-ink">
                  <CheckIcon className="h-3 w-3 text-indiagreen-700 shrink-0" />
                  <span><strong>Explainable Scoring:</strong> Deterministic weights (0–100)</span>
                </div>
                <div className="flex items-center gap-1.5 text-ink">
                  <CheckIcon className="h-3 w-3 text-indiagreen-700 shrink-0" />
                  <span><strong>CVC Vigilance:</strong> Instant cross-reference against debarment</span>
                </div>
                <div className="flex items-center gap-1.5 text-ink">
                  <CheckIcon className="h-3 w-3 text-indiagreen-700 shrink-0" />
                  <span><strong>Court-Proof Audit Trail:</strong> Every rule check timestamped</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-line text-[10px] text-ink-faint">
              Human-in-the-loop · Officer retains statutory award authority
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Live Algorithm Lab */}
      {activeTab === 'lab' && (
        <div className="mt-4 rounded-lg bg-surface-low p-4 border border-line">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-heading text-sm font-bold text-navy">
                Interactive Government Algorithm Simulator
              </h3>
              <p className="text-[11px] text-ink-muted">
                Test how the deterministic layer validates mathematical checksums and structural entity types in real-time.
              </p>
            </div>

            {/* Quick Test Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[10px] text-ink-faint uppercase font-bold">Presets:</span>
              <button
                onClick={() => {
                  setInputType('GSTIN');
                  setTestInput('33AAACC1206D1ZN');
                }}
                className="rounded bg-surface-lowest px-2 py-0.5 text-[11px] font-mono font-medium text-navy hover:bg-indiagreen/10 border border-line"
              >
                Chennai (Valid GSTIN)
              </button>
              <button
                onClick={() => {
                  setInputType('GSTIN');
                  setTestInput('27AABCS4321L1ZA');
                }}
                className="rounded bg-surface-lowest px-2 py-0.5 text-[11px] font-mono font-medium text-risk-high hover:bg-risk-high/10 border border-line"
              >
                Swift (Corrupted Checksum)
              </button>
              <button
                onClick={() => {
                  setInputType('PAN');
                  setTestInput('AAEFM55O2R');
                }}
                className="rounded bg-surface-lowest px-2 py-0.5 text-[11px] font-mono font-medium text-amber-700 hover:bg-amber-500/10 border border-line"
              >
                Meridian (Invalid PAN Syntax)
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-md border border-line bg-surface-lowest p-0.5 shrink-0">
              <button
                onClick={() => setInputType('GSTIN')}
                className={`rounded px-2.5 py-1 text-xs font-semibold ${
                  inputType === 'GSTIN' ? 'bg-navy text-white' : 'text-ink-muted'
                }`}
              >
                GSTIN (Mod-36)
              </button>
              <button
                onClick={() => setInputType('PAN')}
                className={`rounded px-2.5 py-1 text-xs font-semibold ${
                  inputType === 'PAN' ? 'bg-navy text-white' : 'text-ink-muted'
                }`}
              >
                PAN (Section 139A)
              </button>
            </div>

            <input
              value={testInput}
              onChange={(e) => setTestInput(e.target.value.toUpperCase().trim())}
              placeholder={inputType === 'GSTIN' ? 'Enter 15-char GSTIN…' : 'Enter 10-char PAN…'}
              maxLength={inputType === 'GSTIN' ? 15 : 10}
              className="field font-mono text-xs uppercase"
            />
          </div>

          {/* Result Output */}
          <div className="mt-3 rounded-lg border border-line bg-surface-lowest p-3">
            {inputType === 'GSTIN' && gstinResult && (
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold ${
                      gstinResult.valid
                        ? 'bg-indiagreen/15 text-indiagreen-700'
                        : 'bg-risk-high/15 text-risk-high'
                    }`}
                  >
                    {gstinResult.valid ? <CheckIcon className="h-3 w-3" /> : <AlertTriangleIcon className="h-3 w-3" />}
                    {gstinResult.valid ? 'MOD-36 CHECKSUM PASSED' : 'CHECKSUM FAILED'}
                  </span>
                  <span className="font-mono text-xs text-ink-muted">
                    Input: {testInput}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 pt-2 border-t border-line/60">
                  <div>
                    <span className="text-[10px] text-ink-faint block">State Jurisdiction:</span>
                    <span className="font-semibold text-navy">
                      {gstinResult.stateCode ? `Code ${gstinResult.stateCode}` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-faint block">Embedded PAN:</span>
                    <span className="font-mono font-semibold text-navy">
                      {gstinResult.embeddedPan ?? '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-faint block">Entity Registration #:</span>
                    <span className="font-semibold text-navy">
                      {gstinResult.entityCode ? `#${gstinResult.entityCode}` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-faint block">Calculated Check Char:</span>
                    <span className="font-mono font-bold text-navy">
                      Expected: {gstinResult.expectedCheckChar ?? '—'} · Actual: {gstinResult.checkChar ?? '—'}
                    </span>
                  </div>
                </div>

                {!gstinResult.valid && gstinResult.error && (
                  <div className="mt-2 rounded bg-risk-high/5 p-2 text-xs font-medium text-risk-high border border-risk-high/20">
                    ⚠️ {gstinResult.error}
                  </div>
                )}
              </div>
            )}

            {inputType === 'PAN' && panResult && (
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold ${
                      panResult.valid
                        ? 'bg-indiagreen/15 text-indiagreen-700'
                        : 'bg-risk-high/15 text-risk-high'
                    }`}
                  >
                    {panResult.valid ? <CheckIcon className="h-3 w-3" /> : <AlertTriangleIcon className="h-3 w-3" />}
                    {panResult.valid ? 'STRUCTURAL FORMAT VALID' : 'SYNTAX REJECTED'}
                  </span>
                  <span className="font-mono text-xs text-ink-muted">
                    Input: {testInput}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 pt-2 border-t border-line/60">
                  <div>
                    <span className="text-[10px] text-ink-faint block">4th Char (Holder Entity):</span>
                    <span className="font-bold text-navy">
                      {panResult.holderTypeCode ? `"${panResult.holderTypeCode}"` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-faint block">Entity Classification:</span>
                    <span className="font-semibold text-navy">
                      {panResult.holderType ?? '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-faint block">Statutory Source:</span>
                    <span className="font-semibold text-navy">
                      IT Dept Rule 114 / Spec 139A
                    </span>
                  </div>
                </div>

                {!panResult.valid && panResult.error && (
                  <div className="mt-2 rounded bg-risk-high/5 p-2 text-xs font-medium text-risk-high border border-risk-high/20">
                    ⚠️ {panResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
