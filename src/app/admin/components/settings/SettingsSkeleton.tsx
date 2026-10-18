export function SettingsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]" aria-busy="true" aria-label="Loading settings">
      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="h-5 w-48 animate-pulse rounded bg-white/5" />
        <div className="mt-2 h-3 w-72 animate-pulse rounded bg-white/5" />
        <div className="mt-6 space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="h-3.5 w-36 animate-pulse rounded bg-white/5" />
                <div className="h-3 w-64 animate-pulse rounded bg-white/5" />
              </div>
              <div className="h-9 w-40 animate-pulse rounded-lg bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
