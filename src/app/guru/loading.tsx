export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2 pb-1">
        <div className="h-6 w-48 rounded-md bg-slate-200" />
        <div className="h-3.5 w-72 rounded-md bg-slate-200/70" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-slate-900/90 border border-slate-800"
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-40 rounded-xl border border-slate-200 bg-white shadow-xs"
          />
        ))}
      </div>
    </div>
  );
}
