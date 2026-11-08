export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Aero Masthead Skeleton */}
      <div className="-mt-6 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 pt-7 pb-10 bg-[#091424] border-b border-white/10">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto pb-8 space-y-3">
          <div className="h-7 w-72 rounded-lg bg-white/10" />
          <div className="h-4 w-96 max-w-full rounded bg-white/5" />
          <div className="flex gap-3 pt-1">
            <div className="h-8 w-28 rounded-md bg-white/10" />
            <div className="h-8 w-32 rounded-md bg-blue-500/30" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-white/[0.04] border border-white/10 p-5"
            />
          ))}
        </div>
      </div>

      {/* Main Split Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
        <div className="lg:col-span-2 lg:border-r lg:border-slate-200 lg:pr-8 space-y-4">
          <div className="h-5 w-48 rounded bg-slate-200" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-48 rounded-2xl border border-slate-200 bg-slate-50"
              />
            ))}
          </div>
        </div>
        <div>
          <div className="h-64 rounded-2xl border border-slate-200 bg-slate-50" />
        </div>
      </div>
    </div>
  );
}
