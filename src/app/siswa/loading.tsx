export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2 pb-1">
        <div className="h-6 w-48 bg-slate-200" />
        <div className="h-3.5 w-72 bg-slate-200/70" />
      </div>

      <div className="h-20 py-4 border-b border-slate-200" />

      <div className="border-y border-slate-200 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid sm:grid-cols-3 bg-white">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 p-5" />
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3 pt-2">
        <div className="lg:col-span-2 lg:border-r border-slate-200 lg:pr-8 space-y-3">
          <div className="pb-3 border-b border-slate-200">
            <div className="h-4 w-40 bg-slate-200" />
          </div>
          <div className="h-64 border-b border-slate-200" />
        </div>
        <div className="space-y-3">
          <div className="pb-3 border-b border-slate-200">
            <div className="h-4 w-40 bg-slate-200" />
          </div>
          <div className="h-64 border-b border-slate-200" />
        </div>
      </div>
    </div>
  );
}
