'use client';

import { useState, useEffect } from 'react';
import type { PortalApiConfig, GatewayConfigMap } from '@/lib/apiGateway/config';
import { NetworkIcon, CheckIcon, AlertTriangleIcon, RefreshIcon, ShieldCheckIcon, SparkIcon } from '@/components/icons';

export function ApiGatewayConsole({ initialGateways }: { initialGateways: GatewayConfigMap }) {
  const [gateways, setGateways] = useState<GatewayConfigMap>(initialGateways);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  const activeCount = Object.values(gateways).filter((g) => g.enabled && g.endpointUrl).length;

  async function handleToggle(portalKey: string, currentEnabled: boolean) {
    const newEnabled = !currentEnabled;
    try {
      const res = await fetch('/api/admin/api-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          portalKey,
          updates: { enabled: newEnabled },
        }),
      });
      const data = await res.json();
      if (data.success && data.updated) {
        setGateways((prev) => ({
          ...prev,
          [portalKey]: data.updated,
        }));
      }
    } catch (err: any) {
      setGlobalMessage(`Failed to update toggle: ${err.message}`);
    }
  }

  async function handleFieldChange(portalKey: string, field: 'endpointUrl' | 'authHeader', value: string) {
    setGateways((prev) => ({
      ...prev,
      [portalKey]: {
        ...prev[portalKey],
        [field]: value,
      },
    }));
  }

  async function handleSavePortal(portalKey: string) {
    const p = gateways[portalKey];
    setLoadingKey(portalKey);
    try {
      const res = await fetch('/api/admin/api-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          portalKey,
          updates: {
            endpointUrl: p.endpointUrl,
            authHeader: p.authHeader,
            enabled: p.enabled,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGlobalMessage(`Configuration saved for ${p.name}.`);
        setTimeout(() => setGlobalMessage(null), 3000);
      }
    } catch (err: any) {
      setGlobalMessage(`Save error: ${err.message}`);
    } finally {
      setLoadingKey(null);
    }
  }

  async function handlePing(portalKey: string) {
    setLoadingKey(portalKey);
    try {
      const res = await fetch('/api/admin/api-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ping',
          portalKey,
        }),
      });
      const data = await res.json();
      if (data.success && data.updatedConfig) {
        setGateways((prev) => ({
          ...prev,
          [portalKey]: data.updatedConfig,
        }));
      }
    } catch (err: any) {
      setGlobalMessage(`Ping error: ${err.message}`);
    } finally {
      setLoadingKey(null);
    }
  }

  async function handleApplyPreset(preset: 'evaluator-mock' | 'reset-deterministic') {
    setLoadingKey('preset');
    try {
      const res = await fetch('/api/admin/api-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preset', preset }),
      });
      const data = await res.json();
      if (data.success && data.gateways) {
        setGateways(data.gateways);
        setGlobalMessage(
          preset === 'evaluator-mock'
            ? 'Activated Evaluator Live Mock Gateway Suite (all 7 portals pointing to live HTTP routes).'
            : 'Reset all portals to Air-Gapped / Deterministic Local mode.'
        );
        setTimeout(() => setGlobalMessage(null), 4000);
      }
    } catch (err: any) {
      setGlobalMessage(`Preset error: ${err.message}`);
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="card border-l-4 border-l-navy bg-surface-lowest p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-navy/10 p-1.5 text-navy">
                <NetworkIcon className="h-5 w-5" />
              </span>
              <h2 className="font-heading text-lg font-bold text-navy">
                Government Portal API Gateway Router
              </h2>
            </div>
            <p className="mt-1 text-xs text-ink-muted max-w-2xl">
              Plug-and-play gateway enabling instant connection to live external Government APIs provided by CPCL /
              Ministry evaluators (GSTN, PAN, Udyam, CVC Debarment, DigiLocker, EPFO, MCA21).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-line bg-surface-low px-3 py-2 text-right">
              <div className="text-[10px] uppercase tracking-wider text-ink-faint">Live Gateway Status</div>
              <div className="text-sm font-bold text-navy">
                {activeCount > 0 ? (
                  <span className="text-indiagreen-700 flex items-center gap-1.5 justify-end">
                    <span className="h-2 w-2 rounded-full bg-indiagreen animate-pulse" />
                    {activeCount} Live / {Object.keys(gateways).length} Portals
                  </span>
                ) : (
                  <span className="text-ink-muted">Deterministic Local (Air-Gapped)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick 1-Click Action Presets */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-line/70">
          <span className="text-[11px] font-semibold text-ink-muted mr-1">Evaluator Quick Presets:</span>
          <button
            type="button"
            onClick={() => handleApplyPreset('evaluator-mock')}
            disabled={loadingKey === 'preset'}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
          >
            <SparkIcon className="h-3.5 w-3.5 text-saffron-300" />
            1-Click: Enable Live Mock Gateway Suite
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('reset-deterministic')}
            disabled={loadingKey === 'preset'}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <ShieldCheckIcon className="h-3.5 w-3.5 text-navy" />
            Reset to Air-Gapped Deterministic Mode
          </button>
        </div>

        {globalMessage && (
          <div className="mt-3 rounded-md border border-navy/20 bg-navy/5 px-3 py-2 text-xs font-medium text-navy">
            {globalMessage}
          </div>
        )}
      </div>

      {/* Grid of Portals */}
      <div className="grid gap-4 md:grid-cols-2">
        {Object.values(gateways).map((p) => {
          const isLive = p.enabled && p.endpointUrl;
          const isPending = loadingKey === p.key;

          return (
            <div
              key={p.key}
              className={`card flex flex-col justify-between border transition-all ${
                isLive
                  ? 'border-indiagreen/40 bg-surface-lowest shadow-sm ring-1 ring-indiagreen/20'
                  : 'border-line bg-surface-lowest'
              }`}
            >
              <div>
                {/* Portal Header */}
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-line">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      {p.authority}
                    </span>
                    <h3 className="font-heading text-sm font-bold text-navy leading-tight mt-0.5">
                      {p.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`badge text-[10px] px-2 py-0.5 font-semibold ${
                        isLive ? 'badge-success' : 'badge-neutral'
                      }`}
                    >
                      {isLive ? '● Live API Active' : 'Deterministic Checksum'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={() => handleToggle(p.key, p.enabled)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-surface-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-navy"></div>
                    </label>
                  </div>
                </div>

                {/* Endpoint Configuration Form */}
                <div className="mt-3 space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-ink-muted">
                      Evaluator API Endpoint URL
                    </label>
                    <input
                      type="text"
                      value={p.endpointUrl || ''}
                      onChange={(e) => handleFieldChange(p.key, 'endpointUrl', e.target.value)}
                      placeholder="e.g. https://eval-api.cpcl.gov.in/gst/verify or /api/mock-gov-gateways/gst"
                      className="field font-mono text-[11px] py-1.5 mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-ink-muted">
                      Authorization Header / Bearer Token
                    </label>
                    <input
                      type="password"
                      value={p.authHeader || ''}
                      onChange={(e) => handleFieldChange(p.key, 'authHeader', e.target.value)}
                      placeholder="e.g. Bearer EVAL_SECRET_TOKEN_2026"
                      className="field font-mono text-[11px] py-1.5 mt-1"
                    />
                  </div>

                  {/* Ping Diagnostics */}
                  {p.lastPingStatus && p.lastPingStatus !== 'IDLE' && (
                    <div
                      className={`rounded-md p-2 text-[11px] border flex items-center justify-between ${
                        p.lastPingStatus === 'OK'
                          ? 'bg-indiagreen/10 border-indiagreen/30 text-indiagreen-800'
                          : 'bg-critical/10 border-critical/30 text-critical-fg'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {p.lastPingStatus === 'OK' ? (
                          <CheckIcon className="h-3.5 w-3.5 text-indiagreen" />
                        ) : (
                          <AlertTriangleIcon className="h-3.5 w-3.5 text-critical" />
                        )}
                        <span>
                          {p.lastPingStatus === 'OK'
                            ? `Live Endpoint Reachable · ${p.lastPingLatencyMs}ms latency`
                            : `Probe Failed: ${p.lastPingError || 'Unreachable'}`}
                        </span>
                      </div>
                      {p.lastPingTime && <span className="text-[10px] text-ink-faint">{p.lastPingTime}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handlePing(p.key)}
                  disabled={isPending || !p.endpointUrl}
                  className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1 text-navy hover:text-navy font-medium"
                >
                  <RefreshIcon className={`h-3 w-3 ${isPending ? 'animate-spin' : ''}`} />
                  Test Ping Probe
                </button>

                <button
                  type="button"
                  onClick={() => handleSavePortal(p.key)}
                  disabled={isPending}
                  className="btn-primary text-xs py-1 px-3"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
