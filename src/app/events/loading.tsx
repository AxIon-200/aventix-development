import PageShell from "@/components/layout/PageShell";
export default function LoadingEvents() {
  return <PageShell><div aria-busy="true" role="status" className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-16"><p className="text-[#66fcf1]">Loading events…</p><div aria-hidden className="mt-8 grid animate-pulse gap-6 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map(n => <div key={n} className="h-80 rounded-2xl bg-[#1f2833]" />)}</div></div></PageShell>;
}
