"use client";

import React from "react";
import Image from "next/image";
import { MapPin, ArrowRight } from "lucide-react";

export interface EventItem {
  id: string;
  month: string;
  day: string;
  year: string;
  title: string;
  artist: string;
  venue: string;
  price: string;
  imageUrl: string;
}

export const TRENDING_EVENTS: EventItem[] = [
  {
    id: "puth-2026",
    month: "OCT",
    day: "14",
    year: "2026",
    title: "Whatever's Clever! World Tour",
    artist: "Charlie Puth",
    venue: "SM Mall of Asia Arena, Pasay",
    price: "₱2,200",
    imageUrl: "/images/charlie_puth.jpg",
  },
  {
    id: "wte-2026",
    month: "NOV",
    day: "15",
    year: "2026",
    title: "The Pieces Tour",
    artist: "wave to earth, Milena",
    venue: "SM Mall of Asia Arena, Pasay",
    price: "₱2,200",
    imageUrl: "/images/wave_to_earth.jpg",
  },
  {
    id: "m5-2027",
    month: "FEB",
    day: "07",
    year: "2027",
    title: "Maroon 5 Asia 2027",
    artist: "Maroon 5",
    venue: "SM Mall of Asia Arena, Pasay",
    price: "₱2,200",
    imageUrl: "/images/maroon5.jpg",
  },
  {
    id: "bts-2027",
    month: "MAR",
    day: "13",
    year: "2027",
    title: "BTS World Tour 'ARIRANG' in Bulacan",
    artist: "BTS",
    venue: "Philippine Sports Stadium, Bulacan",
    price: "₱2,200",
    imageUrl: "/images/bts.jpg",
  },
];

interface TrendingEventsProps {
  onSelectEvent?: (event: EventItem) => void;
  onViewAll?: () => void;
}

export default function TrendingEvents({
  onSelectEvent,
  onViewAll,
}: TrendingEventsProps) {
  return (
    <section id="trending-events" className="py-16 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-[#00e5be] text-xs font-bold tracking-[0.2em] uppercase block mb-1">
              DON&apos;T MISS OUT
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Trending Events
            </h2>
          </div>

          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#00e5be] hover:text-[#37f2ce] transition-colors group self-start sm:self-auto"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* 4 Event Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TRENDING_EVENTS.map((event) => (
            <div
              key={event.id}
              className="bg-[#121b26] border border-[#1e2d3f] rounded-2xl overflow-hidden hover:border-[#00e5be]/50 hover:shadow-[0_12px_30px_rgba(0,229,190,0.15)] transition-all duration-300 flex flex-col group"
            >
              {/* Image Container with Date Badge Overlay */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#182332]">
                <Image
                  src={event.imageUrl}
                  alt={`${event.title} - ${event.artist}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Floating Date Badge */}
                <div className="absolute top-3 left-3 bg-[#0d141e]/90 backdrop-blur-md border border-[#223347] rounded-lg px-2.5 py-1.5 text-center min-w-[48px] shadow-lg">
                  <span className="text-[10px] font-bold text-[#00e5be] tracking-wider uppercase block leading-tight">
                    {event.month}
                  </span>
                  <span className="text-lg font-extrabold text-white block leading-none my-0.5">
                    {event.day}
                  </span>
                  <span className="text-[9px] font-medium text-slate-400 block leading-tight">
                    {event.year}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-white group-hover:text-[#00e5be] transition-colors line-clamp-1 leading-snug">
                    {event.title}
                  </h3>

                  <p className="text-xs font-semibold text-[#00e5be] mt-1 line-clamp-1">
                    {event.artist}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                </div>

                {/* Card Footer: Price & Book Now button */}
                <div className="pt-4 mt-3 border-t border-[#1a2737] flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] text-slate-400 block leading-none">
                      Starts from
                    </span>
                    <span className="text-sm font-extrabold text-white mt-0.5 block">
                      {event.price}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectEvent?.(event)}
                    className="bg-[#00e5be] hover:bg-[#34f0cb] text-[#091519] font-bold text-xs px-4 py-2 rounded-full transition-all shadow-[0_0_15px_rgba(0,229,190,0.25)] hover:shadow-[0_0_20px_rgba(0,229,190,0.45)] hover:scale-105 active:scale-95"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
