export default function TenderLoading() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-32 animate-pulse rounded bg-surface-high" />
      <div className="h-40 animate-pulse rounded-xl border border-line bg-surface-lowest shadow-card" />
      <div className="overflow-hidden rounded-xl border border-line bg-surface-lowest shadow-card">
        <div className="h-10 bg-surface-container" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-line px-4 py-3.5">
            <div className="h-4 w-48 animate-pulse rounded bg-surface-high" />
            <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-surface-high" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-surface-high" />
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-faint">Loading tender…</p>
    </div>
  );
}
