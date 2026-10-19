"use client";

import { useRouter } from "next/navigation";

export default function TicketsError() {
  const router = useRouter();

  return (
    <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
      <p className="text-sm font-semibold text-red-300">We couldn&apos;t load your tickets.</p>
      <p className="mt-1 text-xs text-slate-400">Check your connection and try again.</p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="mt-4 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-medium text-white transition hover:border-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
      >
        Try again
      </button>
    </div>
  );
}
