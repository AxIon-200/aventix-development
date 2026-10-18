import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function EventNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0b0c10]">
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-sm font-semibold tracking-wide text-[#66fcf1]">EVENT UNAVAILABLE</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white">We couldn&apos;t find that event</h1>
        <p className="mt-3 max-w-md text-[#c5c6c7]">
          It may have been removed or the link may be wrong. Browse upcoming events instead.
        </p>
        <Link
          href="/#trending-events"
          className="mt-8 rounded-full bg-[#66fcf1] px-8 py-3.5 text-[15px] font-bold text-[#0b0c0b] shadow-glow transition hover:bg-[#8afff6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Browse events
        </Link>
      </main>
      <Footer />
    </div>
  );
}
