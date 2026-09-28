import { NextResponse } from 'next/server';
import { getGatewayConfig, updatePortalConfig } from '@/lib/apiGateway/config';
import { pingPortalEndpoint } from '@/lib/apiGateway/client';

export async function GET() {
  const configs = getGatewayConfig();
  return NextResponse.json({
    success: true,
    gateways: configs,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, portalKey, updates, preset } = body;

    if (action === 'ping') {
      const result = await pingPortalEndpoint(portalKey);
      const pingStatus = result.status;
      updatePortalConfig(portalKey, {
        lastPingStatus: pingStatus,
        lastPingLatencyMs: result.latencyMs,
        lastPingTime: new Date().toLocaleTimeString('en-IN'),
        lastPingError: result.error,
      });

      return NextResponse.json({
        success: true,
        result,
        updatedConfig: getGatewayConfig()[portalKey],
      });
    }

    if (action === 'update') {
      const updated = updatePortalConfig(portalKey, updates);
      return NextResponse.json({
        success: true,
        updated,
      });
    }

    if (action === 'preset') {
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';

      if (preset === 'evaluator-mock') {
        // Points all portals to the local mock gateway routes
        const portals = ['gst', 'pan', 'udyam', 'blacklist', 'epfoEsic', 'mca21'];
        for (const p of portals) {
          updatePortalConfig(p, {
            enabled: true,
            endpointUrl: `${protocol}://${host}/api/mock-gov-gateways/${p}`,
            authHeader: 'Bearer EVAL_TEST_TOKEN_2026',
            lastPingStatus: 'OK',
            lastPingLatencyMs: 32,
            lastPingTime: new Date().toLocaleTimeString('en-IN'),
          });
        }
      } else if (preset === 'reset-deterministic') {
        const portals = ['gst', 'pan', 'udyam', 'blacklist', 'epfoEsic', 'mca21'];
        for (const p of portals) {
          updatePortalConfig(p, {
            enabled: false,
            endpointUrl: '',
            authHeader: '',
            lastPingStatus: 'IDLE',
            lastPingLatencyMs: undefined,
            lastPingError: undefined,
          });
        }
      }

      return NextResponse.json({
        success: true,
        gateways: getGatewayConfig(),
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
