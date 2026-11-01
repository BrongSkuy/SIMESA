export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-2">
          <div className="h-6 w-52 rounded-md bg-slate-200" />
          <div className="h-3.5 w-80 rounded-md bg-slate-200/70" />
        </div>
        <div className="h-8 w-36 rounded-lg bg-slate-200/80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-slate-900/90 border border-slate-800"
          />
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="p-5 border-b border-slate-100">
          <div className="h-4 w-44 rounded bg-slate-200" />
        </div>
        <div className="p-5 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-full rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
