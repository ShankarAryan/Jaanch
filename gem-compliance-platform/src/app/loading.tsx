export default function GlobalLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top bar loading skeleton */}
      <div className="h-4 w-32 bg-slate-200 rounded"></div>

      {/* Header skeleton */}
      <div className="card space-y-4 p-6 bg-white border border-line">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-5 w-24 bg-slate-200 rounded"></div>
            <div className="h-8 w-3/4 max-w-md bg-slate-200 rounded"></div>
            <div className="h-4 w-1/2 max-w-xs bg-slate-100 rounded"></div>
          </div>
          <div className="h-8 w-28 bg-slate-200 rounded-full"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-line">
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
        </div>
      </div>

      {/* Content grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-40 bg-white border border-line rounded-lg p-4 space-y-3">
          <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
          <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
          <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
        </div>
        <div className="h-40 bg-white border border-line rounded-lg p-4 space-y-3">
          <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
          <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
          <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
        </div>
      </div>
    </div>
  );
}
