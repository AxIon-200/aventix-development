import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0b0c10]">
      <Navbar />
      <main className="flex-1" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading event…</span>
        <div className="animate-pulse bg-[#0d3a29]/60">
          <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_406px] lg:px-28">
            <div className="space-y-4">
              <div className="h-5 w-32 rounded-full bg-white/10" />
              <div className="h-10 w-4/5 rounded bg-white/10" />
              <div className="h-10 w-3/5 rounded bg-white/10" />
              <div className="h-5 w-48 rounded bg-white/10" />
              <div className="h-12 w-40 rounded-full bg-white/10" />
            </div>
            <div className="aspect-[410/268] rounded-lg bg-white/10" />
          </div>
        </div>
        <div className="mx-auto max-w-[1440px] animate-pulse space-y-6 px-4 py-12 sm:px-6 lg:px-16">
          <div className="h-14 w-60 rounded bg-[#151b23]" />
          <div className="h-32 rounded-2xl bg-[#151b23]" />
          <div className="h-32 rounded-2xl bg-[#151b23]" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
