export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2 pb-1">
        <div className="h-6 w-48 bg-slate-200" />
        <div className="h-3.5 w-72 bg-slate-200/70" />
      </div>

      <div className="border-y border-slate-200 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid sm:grid-cols-3 bg-white">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 p-5" />
        ))}
      </div>

      <div className="grid gap-8 sm:grid-cols-2 pt-2">
        <div className="space-y-3 sm:border-r border-slate-200 sm:pr-8">
          <div className="pb-3 border-b border-slate-200">
            <div className="h-4 w-40 bg-slate-200" />
          </div>
          <div className="h-48 border-b border-slate-200" />
        </div>
        <div className="space-y-3">
          <div className="pb-3 border-b border-slate-200">
            <div className="h-4 w-40 bg-slate-200" />
          </div>
          <div className="h-48 border-b border-slate-200" />
        </div>
      </div>
    </div>
  );
}
