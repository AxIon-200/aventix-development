import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import {
  Home,
  Ticket,
  Compass,
  Search,
  HelpCircle,
  Music,
  ArrowRight,
  Disc3,
  Calendar,
} from "lucide-react";

export const metadata: Metadata = {
  title: "404 - Stage Dark | Aventix",
  description: "The page or concert setlist you are looking for doesn't exist or has moved. Explore live concerts, gigs, and festivals across the Philippines on Aventix.",
  robots: {
    index: false,
    follow: true,
  },
};

const POPULAR_DESTINATIONS = [
  {
    title: "Browse All Events",
    description: "Discover upcoming arena concerts, intimate gigs, and music festivals.",
    href: "/events",
    icon: Calendar,
    badge: "Trending",
  },
  {
    title: "About Aventix",
    description: "Learn more about our mission to bring live music fans closer to the stage.",
    href: "/about",
    icon: Compass,
    badge: "Story",
  },
  {
    title: "Help & Support",
    description: "Get answers to booking queries, ticketing FAQs, and reach our support team.",
    href: "/contact",
    icon: HelpCircle,
    badge: "24/7 Help",
  },
  {
    title: "For Organizers",
    description: "Sell tickets and manage your live music shows with seamless entry tools.",
    href: "/register/organizer",
    icon: Ticket,
    badge: "Partners",
  },
];

export default function NotFound() {
  return (
    <PageShell>
      <div className="relative isolate min-h-[calc(100vh-160px)] overflow-hidden bg-[#0b0c10] py-16 sm:py-24">
        {/* Ambient concert stage glow effects */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute left-1/2 top-10 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] sm:h-[700px] sm:w-[700px] rounded-full bg-[#66fcf1]/10 blur-[130px]" />
          <div className="absolute -left-40 top-1/3 h-[400px] w-[400px] rounded-full bg-[#45a29e]/10 blur-[120px]" />
          <div className="absolute -right-40 bottom-10 h-[450px] w-[450px] rounded-full bg-[#66fcf1]/8 blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#1f2833_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Main Hero Notification Card */}
          <section
            aria-labelledby="not-found-heading"
            className="relative mx-auto flex max-w-3xl flex-col items-center text-center"
          >
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#66fcf1]/30 bg-[#151b23]/90 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#66fcf1] shadow-glow backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#66fcf1] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#66fcf1]" />
              </span>
              <span>ERROR 404 • TRACK NOT FOUND</span>
            </div>

            {/* Glowing 404 Stage Visual */}
            <div className="relative my-6 select-none sm:my-8">
              {/* Huge Neon Number Display */}
              <div className="flex items-center justify-center font-display text-8xl font-black tracking-tighter text-transparent sm:text-9xl md:text-[160px]">
                <span className="bg-gradient-to-b from-white via-[#c5c6c7] to-[#1f2833] bg-clip-text drop-shadow-[0_0_35px_rgba(102,252,241,0.25)]">
                  4
                </span>

                {/* Animated Turntable / Vinyl / Equalizer Center */}
                <div className="relative mx-2 sm:mx-4 flex h-24 w-24 items-center justify-center sm:h-32 sm:w-32 md:h-40 md:w-40">
                  <div className="absolute inset-0 animate-spin rounded-full border-2 border-dashed border-[#66fcf1]/40 [animation-duration:12s]" />
                  <div className="absolute inset-2 rounded-full bg-[#151b23] border border-[#2c3644] shadow-inner flex items-center justify-center">
                    <Disc3 className="h-12 w-12 sm:h-16 sm:w-16 text-[#66fcf1] animate-spin [animation-duration:6s]" />
                  </div>
                  <div className="absolute h-4 w-4 rounded-full bg-[#66fcf1] shadow-glow" />
                </div>

                <span className="bg-gradient-to-b from-white via-[#c5c6c7] to-[#1f2833] bg-clip-text drop-shadow-[0_0_35px_rgba(102,252,241,0.25)]">
                  4
                </span>
              </div>

              {/* Soundwave Bars Accent */}
              <div className="mt-2 flex items-center justify-center gap-1.5 sm:gap-2">
                {[40, 65, 30, 85, 50, 100, 45, 90, 35, 75, 40].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h * 0.28}px` }}
                    className="w-1 rounded-full bg-gradient-to-t from-[#1f2833] via-[#45a29e] to-[#66fcf1] opacity-70 animate-pulse"
                  />
                ))}
              </div>
            </div>

            {/* Headline and Copy */}
            <h1
              id="not-found-heading"
              className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl"
            >
              Looks like this stage is empty.
            </h1>
            <p className="mt-4 max-w-xl text-base text-[#c5c6c7] sm:text-lg">
              The encore ended early or the page you are looking for has been moved, removed, or never made the setlist. Don’t let the music stop — find your next live gig below.
            </p>

            {/* Quick Live Concert Search Bar */}
            <form
              action="/events"
              method="GET"
              className="mt-8 flex w-full max-w-md items-center rounded-full border border-[#2c3644] bg-[#151b23]/95 p-1.5 shadow-lg backdrop-blur-md transition-all focus-within:border-[#66fcf1] focus-within:shadow-glow"
            >
              <div className="flex pl-3.5 text-[#8a8b8c]">
                <Search className="h-4 w-4 text-[#66fcf1]" />
              </div>
              <input
                type="text"
                name="q"
                id="search-404-events"
                placeholder="Search artists, concerts, venues..."
                className="w-full bg-transparent px-3 py-1.5 text-sm text-white placeholder-[#8a8b8c] outline-none"
              />
              <button
                type="submit"
                id="search-404-submit"
                className="rounded-full bg-[#66fcf1] px-4 py-2 text-xs font-semibold text-[#0b0c10] transition hover:bg-[#8afff6] hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#66fcf1]"
              >
                Find Shows
              </button>
            </form>

            {/* Primary Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/"
                id="btn-back-home"
                className="inline-flex items-center gap-2 rounded-full bg-[#66fcf1] px-6 py-3 text-sm font-semibold text-[#0b0c10] shadow-glow transition duration-150 hover:bg-[#8afff6] hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#66fcf1]"
              >
                <Home className="h-4 w-4" />
                <span>Back to Main Stage</span>
              </Link>

              <Link
                href="/events"
                id="btn-explore-events"
                className="inline-flex items-center gap-2 rounded-full border border-[#2c3644] bg-[#151b23] px-6 py-3 text-sm font-semibold text-white transition duration-150 hover:border-[#66fcf1]/60 hover:bg-[#1f2833] hover:text-[#66fcf1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#66fcf1]"
              >
                <Music className="h-4 w-4 text-[#66fcf1]" />
                <span>Explore Live Events</span>
              </Link>
            </div>
          </section>

          {/* Useful Destinations / Shortcuts Grid */}
          <section
            aria-labelledby="popular-links-heading"
            className="mt-16 sm:mt-20 border-t border-[#1f2833] pt-12"
          >
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#66fcf1]">
                Quick Discovery
              </p>
              <h2
                id="popular-links-heading"
                className="mt-1 font-display text-xl font-bold text-white sm:text-2xl"
              >
                Where would you like to go next?
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {POPULAR_DESTINATIONS.map((dest) => {
                const IconComponent = dest.icon;
                return (
                  <Link
                    key={dest.title}
                    href={dest.href}
                    className="group relative flex flex-col justify-between rounded-2xl border border-[#242c36] bg-[#151b23]/80 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#66fcf1]/50 hover:bg-[#1f2833] hover:shadow-glow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#66fcf1]"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2c3644] bg-[#0b0c10] text-[#66fcf1] transition-colors group-hover:border-[#66fcf1]/50">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-[#1f2833] px-2.5 py-0.5 text-[10px] font-medium text-[#8fa9a0] group-hover:text-[#66fcf1]">
                          {dest.badge}
                        </span>
                      </div>
                      <h3 className="mt-4 font-display text-base font-bold text-white group-hover:text-[#66fcf1]">
                        {dest.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#c5c6c7]">
                        {dest.description}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#66fcf1] opacity-80 group-hover:opacity-100">
                      <span>Go to page</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
