"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

interface OrganizerBannerProps {
  onBecomeOrganizer?: () => void;
}

export default function OrganizerBanner({ onBecomeOrganizer }: OrganizerBannerProps) {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Glowing Turquoise Banner Box */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#42f7d8] via-[#24ddbe] to-[#1ac7ab] p-8 sm:p-12 md:p-14 overflow-hidden shadow-[0_0_50px_rgba(0,229,190,0.3)] flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Subtle decorative circles */}
          <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-[#00a887]/20 blur-2xl pointer-events-none" />

          {/* Left Text Content */}
          <div className="relative z-10 max-w-xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#06191c] tracking-tight mb-2.5">
              Are You an Organizer?
            </h2>
            <p className="text-[#0d343a] text-sm sm:text-base font-medium leading-relaxed">
              List your concert, gig, or festival on Aventix and reach thousands of music
              lovers across the Philippines.
            </p>
          </div>

          {/* Right Action Button */}
          <div className="relative z-10 shrink-0">
            <button
              onClick={onBecomeOrganizer}
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-[#070e13] hover:bg-[#121c25] text-white font-bold text-sm sm:text-base transition-all duration-300 shadow-2xl hover:scale-105 active:scale-95 group"
            >
              <span>Become an Organizer</span>
              <ArrowRight className="w-4 h-4 text-[#00e5be] transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
