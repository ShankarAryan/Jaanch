export default function BidderLoading() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-32 animate-pulse rounded bg-surface-high" />
      <div className="h-28 animate-pulse rounded-xl border border-line bg-surface-lowest shadow-card" />
      <div className="h-24 animate-pulse rounded-xl border border-line bg-surface-lowest shadow-card" />
      <div className="card space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-surface-container" />
        ))}
      </div>
      <p className="text-xs text-ink-faint">Loading bidder…</p>
    </div>
  );
}
