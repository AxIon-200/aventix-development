import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface OrganizerBannerProps {
  /** Landing page opens the organizer modal; otherwise the button links to `href`. */
  onBecomeOrganizer?: () => void;
  href?: string;
}

const buttonClass =
  "group relative inline-flex items-center gap-2 rounded-full bg-[#0b0c10] px-8 py-4 text-base font-bold text-[#66fcf1] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] transition-all duration-300 hover:bg-[#131d27] hover:scale-105 hover:shadow-[0_0_30px_rgba(11,12,16,0.6)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b0c10]";

export default function OrganizerBanner({ onBecomeOrganizer, href = "/register" }: OrganizerBannerProps) {
  const content = (
    <>
      <span>Become an Organizer</span>
      <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
    </>
  );

  return (
    <section id="organizer-cta" aria-labelledby="organizer-cta-title" className="bg-[#0b0c10] scroll-mt-24 snap-section">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:p-16">
        <div className="relative flex flex-col items-start justify-between gap-8 overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#45a29e] to-[#66fcf1] p-6 sm:p-12 lg:flex-row lg:items-center lg:p-16 shadow-2xl hover:shadow-[0_0_60px_rgba(102,252,241,0.35)] transition-shadow duration-500">
          <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-white/10 blur-[50px]" />
          <div aria-hidden className="pointer-events-none absolute bottom-0 left-10 h-60 w-60 rounded-full bg-[#0b0c10]/20 blur-[50px]" />

          <div className="relative max-w-xl">
            <h2 id="organizer-cta-title" className="font-display text-3xl font-bold leading-10 text-[#0b0c10] sm:text-4xl">
              Are You an Organizer?
            </h2>
            <p className="mt-4 text-base leading-[29px] text-[#0b0c10]/80 sm:text-lg">
              List your concert, gig, or festival on Aventix and reach thousands of music lovers across the Philippines.
            </p>
          </div>

          {onBecomeOrganizer ? (
            <button type="button" onClick={onBecomeOrganizer} className={buttonClass}>
              {content}
            </button>
          ) : (
            <Link href={href} className={buttonClass}>
              {content}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
