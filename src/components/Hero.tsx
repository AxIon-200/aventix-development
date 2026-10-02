"use client";

import React, { useState } from "react";
import { Search, MapPin, Calendar, ArrowRight } from "lucide-react";
import HeroMockups from "./HeroMockups";

interface HeroProps {
  onSearchSubmit?: (filters: { query: string; location: string; date: string }) => void;
  onExploreClick?: () => void;
}

export default function Hero({ onSearchSubmit, onExploreClick }: HeroProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit({ query: searchQuery, location, date });
    }
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#00e5be]/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-[#0099ff]/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline, Description, Search Widget & CTA */}
          <div className="lg:col-span-7 space-y-7 z-10">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121b27]/90 border border-[#213143] shadow-inner backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#00e5be] shadow-[0_0_8px_#00e5be]" />
              <span className="text-xs font-semibold text-[#00e5be] tracking-wide">
                Philippines&apos; #1 Ticketing Platform
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
              Discover &amp; Book{" "}
              <span className="text-[#00e5be] drop-shadow-[0_0_25px_rgba(0,229,190,0.35)]">
                Live
              </span>
              <br />
              <span className="text-[#00e5be] drop-shadow-[0_0_25px_rgba(0,229,190,0.35)]">
                Music
              </span>{" "}
              Across the
              <br />
              Philippines
            </h1>

            {/* Subtitle */}
            <p className="text-slate-400 text-base sm:text-lg max-w-xl font-normal leading-relaxed">
              From sold-out arena concerts to underground gigs and festivals — find your
              next unforgettable night out and secure your ticket in seconds.
            </p>

            {/* Search Bar Widget Container */}
            <form
              onSubmit={handleSearch}
              className="bg-[#121a25]/90 border border-[#223347] backdrop-blur-xl p-2 sm:p-2.5 rounded-2xl shadow-2xl flex flex-col md:flex-row items-stretch md:items-center gap-2 max-w-2xl"
            >
              {/* Field 1: Search artist or event */}
              <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#182332] transition-colors">
                <Search className="w-4 h-4 text-[#00e5be] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search artist or event"
                  className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Vertical divider */}
              <div className="hidden md:block w-px h-8 bg-[#223347]" />

              {/* Field 2: Location */}
              <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#182332] transition-colors">
                <MapPin className="w-4 h-4 text-[#00e5be] shrink-0" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location e.g. Manila"
                  className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Vertical divider */}
              <div className="hidden md:block w-px h-8 bg-[#223347]" />

              {/* Field 3: Date */}
              <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#182332] transition-colors">
                <Calendar className="w-4 h-4 text-[#00e5be] shrink-0" />
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Select date"
                  className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Search button */}
              <button
                type="submit"
                className="bg-[#00e5be] hover:bg-[#32efcc] text-[#091519] font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(0,229,190,0.35)] hover:shadow-[0_0_25px_rgba(0,229,190,0.55)] hover:scale-[1.02] flex items-center justify-center shrink-0"
              >
                Search
              </button>
            </form>

            {/* Explore Events CTA */}
            <div className="pt-2">
              <a
                href="#trending-events"
                onClick={onExploreClick}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#00e5be] hover:bg-[#34f1cd] text-[#091519] font-extrabold text-base transition-all duration-300 shadow-[0_0_35px_rgba(0,229,190,0.5)] hover:shadow-[0_0_45px_rgba(0,229,190,0.7)] hover:scale-105 active:scale-95"
              >
                <span>Explore Events</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </a>
            </div>
          </div>

          {/* Right Column: Hero Perspective Mockup Showcase */}
          <div className="lg:col-span-5 relative hidden lg:block">
            <HeroMockups />
          </div>
        </div>
      </div>
    </section>
  );
}
