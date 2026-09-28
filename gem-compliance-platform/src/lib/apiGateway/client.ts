import { getGatewayConfig, isPortalLiveEnabled } from './config';
import type { VerificationResultPayload, VerificationStatus } from '../providers/types';

export interface LiveApiCallResult {
  success: boolean;
  httpStatus?: number;
  latencyMs: number;
  data?: Record<string, unknown>;
  error?: string;
  endpoint: string;
}

/**
 * Dispatches a real-time HTTP probe or verification request to an external Government API.
 */
export async function callLiveGovernmentApi(
  portalKey: string,
  payload: Record<string, unknown>
): Promise<LiveApiCallResult> {
  const config = getGatewayConfig()[portalKey];
  if (!config || !config.endpointUrl) {
    return {
      success: false,
      latencyMs: 0,
      endpoint: '',
      error: 'Endpoint URL not configured.',
    };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs || 4000);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'GeM-Compliance-Verification-Gateway/2.0 (SIH26100; Government e-Marketplace)',
    };

    if (config.authHeader) {
      if (config.authHeader.startsWith('Bearer ') || config.authHeader.startsWith('Basic ')) {
        headers['Authorization'] = config.authHeader;
      } else {
        headers['Authorization'] = `Bearer ${config.authHeader}`;
        headers['x-api-key'] = config.authHeader;
      }
    }

    const response = await fetch(config.endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    const httpStatus = response.status;

    let responseData: Record<string, unknown> = {};
    try {
      responseData = await response.json();
    } catch {
      responseData = { text: await response.text().catch(() => '') };
    }

    return {
      success: response.ok,
      httpStatus,
      latencyMs,
      data: responseData,
      endpoint: config.endpointUrl,
      error: response.ok ? undefined : `HTTP Error ${httpStatus}: ${JSON.stringify(responseData)}`,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      endpoint: config.endpointUrl,
      error: err.name === 'AbortError' ? `Request timed out after ${config.timeoutMs}ms` : err.message,
    };
  }
}

/**
 * Pings an external endpoint to test reachability and latency without modifying data.
 */
export async function pingPortalEndpoint(portalKey: string): Promise<{
  status: 'OK' | 'FAIL';
  httpStatus?: number;
  latencyMs: number;
  error?: string;
}> {
  const config = getGatewayConfig()[portalKey];
  if (!config || !config.endpointUrl) {
    return { status: 'FAIL', latencyMs: 0, error: 'Endpoint URL is empty.' };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'GeM-Gateway-PingProbe/1.0',
    };
    if (config.authHeader) {
      headers['Authorization'] = config.authHeader.startsWith('Bearer ')
        ? config.authHeader
        : `Bearer ${config.authHeader}`;
    }

    const res = await fetch(config.endpointUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    return {
      status: res.status < 500 ? 'OK' : 'FAIL',
      httpStatus: res.status,
      latencyMs,
      error: res.status >= 500 ? `HTTP ${res.status}` : undefined,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      status: 'FAIL',
      latencyMs: Date.now() - startTime,
      error: err.name === 'AbortError' ? 'Probe timed out (4s)' : err.message,
    };
  }
}
