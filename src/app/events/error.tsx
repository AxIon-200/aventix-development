"use client";

import Link from "next/link";

export default function EventsError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0b0c10] px-4 text-center" role="alert">
      <p className="text-sm font-semibold tracking-wide text-[#66fcf1]">SOMETHING WENT WRONG</p>
      <h1 className="mt-3 font-display text-4xl font-bold text-white">We couldn&apos;t load events</h1>
      <p className="mt-3 max-w-md text-[#c5c6c7]">The events service didn&apos;t respond. Please try again in a moment.</p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={() => retry()} className="rounded-full bg-[#66fcf1] px-8 py-3.5 text-[15px] font-bold text-[#0b0c0b] hover:bg-[#8afff6]">
          Try again
        </button>
        <Link href="/" className="rounded-full border border-[#2c3644] bg-[#1f2833] px-8 py-3.5 text-[15px] font-bold text-white hover:border-[#66fcf1]">
          Home
        </Link>
      </div>
    </main>
  );
}
