export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 animate-pulse rounded bg-surface-high" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="grid w-full gap-4 rounded-lg border border-line bg-surface-lowest p-4 shadow-card sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1.8fr)_minmax(0,1.1fr)_auto]"
          >
            <div>
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-high" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-surface-container" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-surface-container" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-surface-container" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-surface-container" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-surface-container" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-full bg-surface-high sm:ml-auto" />
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-faint">Loading tenders…</p>
    </div>
  );
}
