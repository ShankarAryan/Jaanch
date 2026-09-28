import type { VerificationProvider } from './types';
import { udyamProvider } from './mock/udyam';
import { gstProvider } from './mock/gst';
import { panProvider } from './mock/pan';
import { blacklistProvider } from './mock/blacklist';
import { makeInIndiaProvider } from './mock/makeInIndia';
import { oemAuthorizationProvider } from './mock/oemAuthorization';
import { mca21Provider, epfoEsicProvider, nsicProvider, startupIndiaProvider } from './stub';
import { digilockerProvider } from './real/digilocker';

/**
 * The single place that maps ComplianceRequirement.sourceType -> provider
 * implementation. Swapping a mock for a real integration later is a
 * one-line change here - nothing in the orchestrator, rules engine, or
 * UI needs to know.
 */
export const providerRegistry: Record<string, VerificationProvider> = {
  udyam: udyamProvider,
  gst: gstProvider,
  pan: panProvider,
  blacklist: blacklistProvider,
  makeInIndia: makeInIndiaProvider,
  mca21: mca21Provider,
  epfoEsic: epfoEsicProvider,
  nsic: nsicProvider,
  startupIndia: startupIndiaProvider,
  oemAuthorization: oemAuthorizationProvider,
  digilocker: digilockerProvider,
};

export function getProvider(sourceType: string): VerificationProvider {
  const provider = providerRegistry[sourceType];
  if (!provider) {
    throw new Error(`No provider registered for sourceType "${sourceType}"`);
  }
  return provider;
}
