import { prisma } from '@/lib/db';
import { isPortalLiveEnabled } from '@/lib/apiGateway/config';
import { callLiveGovernmentApi } from '@/lib/apiGateway/client';
import type { VerificationProvider, VerificationResultPayload } from '../types';

export const blacklistProvider: VerificationProvider = {
  key: 'blacklist',
  async verify({ bidder }): Promise<VerificationResultPayload> {
    // --- Live Government / Evaluator API Gateway ---
    if (isPortalLiveEnabled('blacklist')) {
      const liveRes = await callLiveGovernmentApi('blacklist', {
        pan: bidder.pan,
        gstin: bidder.gstin,
        name: bidder.name,
      });

      if (liveRes.success && liveRes.data) {
        const d = liveRes.data;
        const isDebarred = d.debarred === true || d.status === 'DEBARRED' || d.blacklisted === true;
        return {
          status: isDebarred ? 'VERIFIED_FAIL' : 'VERIFIED_OK',
          confidence: 0.99,
          isMock: false,
          method: 'live-api',
          raw: {
            ...d,
            liveGatewayEndpoint: liveRes.endpoint,
            latencyMs: liveRes.latencyMs,
            httpStatus: liveRes.httpStatus,
            note: isDebarred
              ? `Flagged: Bidder found on active debarment list via Central Debarment API Gateway (${liveRes.endpoint}, ${liveRes.latencyMs}ms).`
              : `Cleared: No active debarment record found on Central Debarment API Gateway (${liveRes.endpoint}, ${liveRes.latencyMs}ms).`,
          },
        };
      }
    }

    const entries = await prisma.registryBlacklist.findMany();
    const hit = entries.find((entry) => {
      if (entry.matchField === 'pan') return bidder.pan === entry.matchValue;
      if (entry.matchField === 'gstin') return bidder.gstin === entry.matchValue;
      return bidder.name.toLowerCase().includes(entry.matchValue.toLowerCase());
    });

    if (!hit) {
      return { status: 'VERIFIED_OK', confidence: 0.9, isMock: true, raw: { note: 'No match found on CVC/debarment list (looked up in the Supabase blacklist registry table).' } };
    }

    const stillActive = new Date(hit.debarredUntil).getTime() > Date.now();

    return {
      status: stillActive ? 'VERIFIED_FAIL' : 'VERIFIED_OK',
      confidence: 0.9,
      isMock: true,
      raw: { ...hit, stillActive },
    };
  },
};
