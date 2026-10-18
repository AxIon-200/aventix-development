// Shown while the profile loads; mirrors the page layout so nothing jumps.
export function ProfileSkeleton() {
  const bar = "animate-pulse rounded bg-white/5";
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading profile">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-5">
            <div className="h-24 w-24 animate-pulse rounded-full bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className={`h-5 w-2/3 ${bar}`} />
              <div className={`h-3 w-1/2 ${bar}`} />
              <div className={`h-5 w-1/3 ${bar}`} />
            </div>
          </div>
          <div className={`h-4 w-3/4 ${bar}`} />
          <div className={`h-12 w-full ${bar}`} />
        </div>
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 lg:col-span-2">
          <div className={`h-5 w-1/3 ${bar}`} />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`h-11 ${bar}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-white/5" />
      <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
    </div>
  );
}
