import { getGatewayConfig } from '@/lib/apiGateway/config';
import { ApiGatewayConsole } from '@/components/ApiGatewayConsole';
import { NetworkIcon, ShieldCheckIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default function ApiGatewayPage() {
  const configs = getGatewayConfig();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-navy/10 p-1.5 text-navy">
              <NetworkIcon className="h-5 w-5" />
            </span>
            <h1 className="font-heading text-2xl font-bold text-navy">
              External Government API Gateway Manager
            </h1>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Configure live endpoints and sandbox authentication tokens for official Government of India portals (GSTN, PAN/ITD, Udyam, Debarment, DigiLocker).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-indiagreen-700 bg-indiagreen/10 border border-indiagreen/25">
            <span className="h-2 w-2 rounded-full bg-indiagreen animate-pulse" />
            Zero-Downtime Fallback Active
          </span>
        </div>
      </div>

      {/* Interactive Gateway Console */}
      <ApiGatewayConsole initialGateways={configs} />
    </div>
  );
}
