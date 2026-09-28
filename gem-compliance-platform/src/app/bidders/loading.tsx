export default function BidderLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Return link */}
      <div className="h-4 w-40 bg-slate-200 rounded"></div>

      {/* Bidder Header Card */}
      <div className="card space-y-4 p-6 bg-white border border-line">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex gap-2">
              <div className="h-5 w-24 bg-slate-200 rounded font-mono"></div>
              <div className="h-5 w-20 bg-slate-200 rounded-full"></div>
            </div>
            <div className="h-8 w-80 bg-slate-200 rounded"></div>
            <div className="h-4 w-96 bg-slate-100 rounded"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-24 bg-slate-200 rounded-lg"></div>
            <div className="h-10 w-28 bg-slate-200 rounded-lg"></div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-line">
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
        </div>
      </div>

      {/* Main Column & Sidebar Grid */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* AI Briefing Skeleton */}
          <div className="card p-6 bg-white border border-line space-y-3">
            <div className="h-6 w-56 bg-slate-200 rounded"></div>
            <div className="h-16 bg-slate-100 rounded"></div>
          </div>

          {/* CPSE Intelligence Skeleton */}
          <div className="card p-6 bg-white border border-line space-y-4">
            <div className="flex justify-between">
              <div className="h-5 w-64 bg-slate-200 rounded"></div>
              <div className="h-6 w-24 bg-slate-200 rounded"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="h-16 bg-slate-100 rounded"></div>
              <div className="h-16 bg-slate-100 rounded"></div>
              <div className="h-16 bg-slate-100 rounded"></div>
              <div className="h-16 bg-slate-100 rounded"></div>
            </div>
          </div>

          {/* Matrix Skeleton */}
          <div className="card p-6 bg-white border border-line space-y-3">
            <div className="h-6 w-60 bg-slate-200 rounded"></div>
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-50 border border-line rounded flex items-center justify-between p-3">
                  <div className="h-4 w-48 bg-slate-200 rounded"></div>
                  <div className="h-6 w-20 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <div className="card h-64 bg-white border border-line p-6 space-y-3">
            <div className="h-5 w-40 bg-slate-200 rounded"></div>
            <div className="h-32 bg-slate-100 rounded-full mx-auto w-32"></div>
          </div>
          <div className="card h-64 bg-white border border-line p-6 space-y-3">
            <div className="h-5 w-40 bg-slate-200 rounded"></div>
            <div className="space-y-2">
              <div className="h-8 bg-slate-100 rounded"></div>
              <div className="h-16 bg-slate-100 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
