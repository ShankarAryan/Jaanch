export default function TendersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back button skeleton */}
      <div className="h-4 w-36 bg-slate-200 rounded"></div>

      {/* Tender Header Card */}
      <div className="card space-y-4 p-6 bg-white border border-line">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-5 w-28 bg-slate-200 rounded font-mono"></div>
            <div className="h-8 w-2/3 bg-slate-200 rounded"></div>
            <div className="h-4 w-1/3 bg-slate-100 rounded"></div>
          </div>
          <div className="h-7 w-28 bg-slate-200 rounded-full"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-line">
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
        </div>
      </div>

      {/* Evaluation action bar skeleton */}
      <div className="h-14 bg-white border border-line rounded-lg flex items-center justify-between p-4">
        <div className="h-5 w-48 bg-slate-200 rounded"></div>
        <div className="flex gap-2">
          <div className="h-8 w-36 bg-slate-200 rounded"></div>
          <div className="h-8 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="card p-0 overflow-hidden bg-white border border-line">
        <div className="h-11 bg-slate-100 border-b border-line"></div>
        <div className="divide-y divide-line">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 gap-4">
              <div className="h-5 w-48 bg-slate-200 rounded"></div>
              <div className="h-6 w-20 bg-slate-100 rounded"></div>
              <div className="h-6 w-20 bg-slate-100 rounded"></div>
              <div className="h-5 w-24 bg-slate-100 rounded"></div>
              <div className="h-8 w-24 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
