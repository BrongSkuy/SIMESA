export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-2">
          <div className="h-6 w-52 bg-slate-200" />
          <div className="h-3.5 w-80 bg-slate-200/70" />
        </div>
        <div className="h-8 w-36 bg-slate-200/80" />
      </div>

      <div className="border-y border-slate-200 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid sm:grid-cols-2 lg:grid-cols-4 bg-white">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 p-5" />
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <div className="pb-3 border-b border-slate-200">
          <div className="h-4 w-44 bg-slate-200" />
        </div>
        <div className="border-b border-slate-200 divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
