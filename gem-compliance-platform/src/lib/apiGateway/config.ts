/**
 * Government API Gateway Configuration Store:
 * Supports dynamic runtime switching between:
 * 1. Local Deterministic / Fixture Mode (Default)
 * 2. Live Government / Sandbox API Endpoints (Evaluator-Provided)
 */

export interface PortalApiConfig {
  key: string;
  name: string;
  authority: string;
  enabled: boolean;
  endpointUrl: string;
  authHeader: string; // Bearer token or custom header
  timeoutMs: number;
  lastPingStatus?: 'OK' | 'FAIL' | 'IDLE';
  lastPingLatencyMs?: number;
  lastPingTime?: string;
  lastPingError?: string;
}

export type GatewayConfigMap = Record<string, PortalApiConfig>;

const DEFAULT_PORTALS: GatewayConfigMap = {
  gst: {
    key: 'gst',
    name: 'GSTN Portal API',
    authority: 'Goods & Services Tax Network (GSTN)',
    enabled: process.env.ENABLE_LIVE_GSTN === 'true',
    endpointUrl: process.env.LIVE_GSTN_API_URL || '',
    authHeader: process.env.LIVE_GSTN_API_KEY || '',
    timeoutMs: 4000,
  },
  pan: {
    key: 'pan',
    name: 'NSDL / Income Tax PAN API',
    authority: 'Income Tax Department / NSDL',
    enabled: process.env.ENABLE_LIVE_PAN === 'true',
    endpointUrl: process.env.LIVE_PAN_API_URL || '',
    authHeader: process.env.LIVE_PAN_API_KEY || '',
    timeoutMs: 4000,
  },
  udyam: {
    key: 'udyam',
    name: 'Udyam / MSME Registry API',
    authority: 'Ministry of MSME',
    enabled: process.env.ENABLE_LIVE_UDYAM === 'true',
    endpointUrl: process.env.LIVE_UDYAM_API_URL || '',
    authHeader: process.env.LIVE_UDYAM_API_KEY || '',
    timeoutMs: 4000,
  },
  blacklist: {
    key: 'blacklist',
    name: 'Central Debarment Registry API',
    authority: 'Central Vigilance Commission (CVC) & GeM',
    enabled: process.env.ENABLE_LIVE_DEBARMENT === 'true',
    endpointUrl: process.env.LIVE_DEBARMENT_API_URL || '',
    authHeader: process.env.LIVE_DEBARMENT_API_KEY || '',
    timeoutMs: 4000,
  },
  epfoEsic: {
    key: 'epfoEsic',
    name: 'EPFO & ESIC Compliance API',
    authority: 'Ministry of Labour & Employment',
    enabled: process.env.ENABLE_LIVE_EPFO === 'true',
    endpointUrl: process.env.LIVE_EPFO_API_URL || '',
    authHeader: process.env.LIVE_EPFO_API_KEY || '',
    timeoutMs: 4000,
  },
  mca21: {
    key: 'mca21',
    name: 'MCA21 Company Registry API',
    authority: 'Ministry of Corporate Affairs',
    enabled: process.env.ENABLE_LIVE_MCA21 === 'true',
    endpointUrl: process.env.LIVE_MCA21_API_URL || '',
    authHeader: process.env.LIVE_MCA21_API_KEY || '',
    timeoutMs: 4000,
  },
  digilocker: {
    key: 'digilocker',
    name: 'DigiLocker / API Setu Gateway',
    authority: 'Digital India / MeitY',
    enabled: process.env.USE_REAL_DIGILOCKER === 'true',
    endpointUrl: process.env.DIGILOCKER_SANDBOX_BASE_URL || 'https://api.apisetu.gov.in/sandbox/digilocker',
    authHeader: process.env.DIGILOCKER_SANDBOX_CLIENT_SECRET || '',
    timeoutMs: 5000,
  },
};

// Global in-memory singleton to persist evaluator changes across requests
const globalForGateway = globalThis as unknown as {
  _portalGatewayConfig?: GatewayConfigMap;
};

export function getGatewayConfig(): GatewayConfigMap {
  if (!globalForGateway._portalGatewayConfig) {
    globalForGateway._portalGatewayConfig = { ...DEFAULT_PORTALS };
  }
  return globalForGateway._portalGatewayConfig;
}

export function updatePortalConfig(
  portalKey: string,
  updates: Partial<PortalApiConfig>
): PortalApiConfig {
  const cfg = getGatewayConfig();
  if (!cfg[portalKey]) {
    throw new Error(`Unknown portal key: ${portalKey}`);
  }
  cfg[portalKey] = {
    ...cfg[portalKey],
    ...updates,
  };
  return cfg[portalKey];
}

export function isPortalLiveEnabled(portalKey: string): boolean {
  const cfg = getGatewayConfig();
  const portal = cfg[portalKey];
  return Boolean(portal?.enabled && portal?.endpointUrl?.trim());
}
