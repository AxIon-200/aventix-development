"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, MapPin, Calendar, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import HeroMockups from "./HeroMockups";
import styles from "./Hero.module.css";

interface HeroProps {
  onSearchSubmit?: (filters: { query: string; location: string; date: string }) => void;
  onExploreClick?: () => void;
}

export default function Hero({ onSearchSubmit, onExploreClick }: HeroProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit({ query: searchQuery, location, date });
    } else {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (location.trim()) params.set("location", location.trim());
      if (date) params.set("date", date);
      router.push(`/events?${params.toString()}`);
    }
  };

  return (
    <section className={styles.hero}>
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#66fcf1]/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-[#0099ff]/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Left Column: Headline, Description, Search Widget & CTA */}
          <div className={styles.copy}>
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121b27]/90 border border-[#213143] shadow-inner backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#66fcf1] shadow-[0_0_8px_#66fcf1]" />
              <span className="text-xs font-semibold text-[#66fcf1] tracking-wide">
                Philippines&apos; #1 Ticketing Platform
              </span>
            </div>

            {/* Main Headline */}
            <h1 className={`${styles.title} font-display text-white`}>
              Discover &amp; Book{" "}
              <span className="text-[#66fcf1] drop-shadow-[0_0_25px_rgba(102,252,241,0.35)]">
                Live
              </span>
              <br className="hidden sm:block" />{" "}
              <span className="text-[#66fcf1] drop-shadow-[0_0_25px_rgba(102,252,241,0.35)]">
                Music
              </span>{" "}
              Across the
              <br className="hidden sm:block" />{" "}
              Philippines
            </h1>

            {/* Subtitle */}
            <p className={styles.description}>
              From sold-out arena concerts to underground gigs and festivals — find your
              next unforgettable night out and secure your ticket in seconds.
            </p>

            {/* Search Bar Widget Container */}
            <form
              onSubmit={handleSearch}
              className={`${styles.search} bg-[#121a25]/90 border border-[#223347] p-2 rounded-2xl shadow-2xl`}
            >
              {/* Field 1: Search artist or event */}
              <div className="min-w-0 flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#1f2833] transition-colors">
                <Search className="w-4 h-4 text-[#66fcf1] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search artist or event"
                  placeholder="Search artist or event"
                  className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Vertical divider */}
              <div className="hidden md:block w-px h-8 bg-[#223347]" />

              {/* Field 2: Location */}
              <div className="min-w-0 flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#1f2833] transition-colors">
                <MapPin className="w-4 h-4 text-[#66fcf1] shrink-0" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  aria-label="Event location"
                  placeholder="Location e.g. Manila"
                  className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Vertical divider */}
              <div className="hidden md:block w-px h-8 bg-[#223347]" />

              {/* Field 3: Date */}
              <div className="min-w-0 flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#1f2833] transition-colors">
                <Calendar className="w-4 h-4 text-[#66fcf1] shrink-0" />
                <input
                  type="date"
                  aria-label="Event date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Select date"
                  className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Search button */}
              <button
                type="submit"
                className="bg-[#66fcf1] hover:bg-[#8afff6] text-[#0b0c10] font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(102,252,241,0.35)] hover:shadow-[0_0_25px_rgba(102,252,241,0.55)] hover:scale-[1.02] flex items-center justify-center shrink-0"
              >
                Search
              </button>
            </form>

            {/* Explore Events CTA */}
            <div className="pt-2">
              <Link
                href="/events"
                onClick={onExploreClick}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#66fcf1] hover:bg-[#8afff6] text-[#0b0c10] font-bold text-sm transition-all duration-300 shadow-[0_0_35px_rgba(102,252,241,0.5)] hover:shadow-[0_0_45px_rgba(102,252,241,0.7)] hover:scale-105 active:scale-95"
              >
                <span>Explore Events</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </Link>
            </div>
          </div>

          {/* Right Column: Hero Perspective Mockup Showcase */}
          <div className={styles.showcase}>
            <HeroMockups />
          </div>
        </div>
      </div>
    </section>
  );
}
