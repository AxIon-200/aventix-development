// Shown while the tickets are loading.
export default function LoadingTickets() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your tickets...</span>
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
        <div className="h-7 w-44 animate-pulse rounded bg-white/10" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-[#111622]" />
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-white/10 bg-[#111622] p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-white/5" />
        ))}
      </div>
    </div>
  );
}
