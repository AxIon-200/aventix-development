"use client";

import React from "react";
import {
  MapPin,
  Calendar,
  TrendingUp,
  Ticket,
  Users,
  DollarSign,
  ChevronRight,
  Music,
} from "lucide-react";

export default function HeroMockups() {
  return (
    <div className="relative w-full h-[620px] lg:h-[680px] pointer-events-none select-none overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-[#00e5be]/15 rounded-full blur-[120px]" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#0084ff]/10 rounded-full blur-[100px]" />

      {/* Floating Mockup 1: "03. Event Details Page" (Top Right Layer) */}
      <div className="absolute top-2 right-0 w-[420px] xl:w-[480px] rounded-xl bg-[#0e1622]/95 border border-[#1e2d40] shadow-2xl backdrop-blur-xl p-4 transform rotate-1 hover:rotate-0 transition-transform duration-500 z-20">
        <div className="flex items-center justify-between border-b border-[#1c293a] pb-2 mb-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#00e5be] inline-block animate-pulse" />
            03. Event Details Page
          </div>
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-700" />
            <span className="w-2 h-2 rounded-full bg-slate-700" />
            <span className="w-2 h-2 rounded-full bg-slate-700" />
          </div>
        </div>

        {/* Event Header */}
        <div className="mb-3">
          <span className="text-[10px] font-bold text-[#00e5be] tracking-wider uppercase">
            LIVE IN CONCERT
          </span>
          <h4 className="text-base font-bold text-white tracking-wide">
            LANY LIVE IN MANILA
          </h4>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#00e5be]" /> Mar 31, 2026 • 8:00 PM
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#00e5be]" /> Mall of Asia Arena
            </span>
          </div>
        </div>

        {/* Content split */}
        <div className="grid grid-cols-12 gap-3 text-[11px]">
          {/* Left: Ticket tiers */}
          <div className="col-span-7 space-y-2">
            <span className="text-[10px] font-semibold text-slate-300 block">
              Ticket Categories
            </span>

            <div className="p-2 rounded-lg bg-[#141e2c] border border-[#213247] flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-[11px]">General Admission</p>
                <p className="text-[9px] text-slate-400">Available: 2,400</p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-[#00e5be]">₱1,300</span>
                <div className="flex items-center gap-1 mt-0.5 scale-90 origin-right">
                  <span className="px-1.5 py-0.5 rounded bg-[#1e2d40] text-slate-300">-</span>
                  <span className="text-white text-[10px]">1</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#00e5be] text-[#0a1619] font-bold">+</span>
                </div>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#141e2c] border border-[#213247] flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-[11px]">VIP Floor</p>
                <p className="text-[9px] text-slate-400">Available: 350</p>
              </div>
              <span className="text-[11px] font-bold text-white">₱3,500</span>
            </div>

            <div className="p-2 rounded-lg bg-[#141e2c] border border-[#213247] flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-[11px]">VVIP Experience</p>
                <p className="text-[9px] text-slate-400">Available: 50</p>
              </div>
              <span className="text-[11px] font-bold text-white">₱5,500</span>
            </div>

            <button className="w-full py-1.5 rounded-lg bg-[#00e5be] text-[#091519] font-bold text-[11px] text-center shadow-[0_0_15px_rgba(0,229,190,0.3)]">
              Book Tickets
            </button>
          </div>

          {/* Right: Venue Map & Artist */}
          <div className="col-span-5 space-y-2">
            <div className="p-2 rounded-lg bg-[#141e2c] border border-[#213247]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-[#00e5be]/20 flex items-center justify-center text-[#00e5be]">
                  <Music className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-white text-[10px]">LANY</p>
                  <p className="text-[9px] text-slate-400">Indie Pop</p>
                </div>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#141e2c] border border-[#213247]">
              <p className="text-[10px] font-semibold text-slate-300 mb-1">Venue Location</p>
              <div className="w-full h-16 rounded bg-[#1a2638] relative overflow-hidden flex items-center justify-center border border-[#27384e]">
                {/* Stylized vector map grid */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#00e5be_1px,transparent_1px)] [background-size:8px_8px]" />
                <div className="relative flex flex-col items-center">
                  <MapPin className="w-4 h-4 text-[#00e5be] animate-bounce" />
                  <span className="text-[8px] font-medium text-slate-200 mt-0.5">Mall of Asia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Mockup 2: Organizer Dashboard (Bottom Layer) */}
      <div className="absolute bottom-2 right-4 w-[480px] xl:w-[540px] rounded-xl bg-[#0c131c]/95 border border-[#1b2839] shadow-2xl backdrop-blur-xl p-4 transform -rotate-1 z-10 opacity-90 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between border-b border-[#1c293a] pb-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Welcome back, Organizer</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00e5be]/15 text-[#00e5be] font-medium">
                Verified
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Here&apos;s what&apos;s happening with your events.
            </p>
          </div>
          <span className="text-[10px] text-slate-400 border border-[#233348] rounded px-2 py-0.5">
            Last 30 days ▾
          </span>
        </div>

        {/* 5 KPI Stat Badges */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          <div className="p-2 rounded bg-[#131b26] border border-[#1e2a3a]">
            <span className="text-[9px] text-slate-400 block">Total Events</span>
            <span className="text-xs font-bold text-white">5</span>
            <span className="text-[8px] text-[#00e5be] block mt-0.5">+1 new</span>
          </div>

          <div className="p-2 rounded bg-[#131b26] border border-[#1e2a3a]">
            <span className="text-[9px] text-slate-400 block">Tickets Sold</span>
            <span className="text-xs font-bold text-white">3,842</span>
            <span className="text-[8px] text-[#00e5be] block mt-0.5">+18%</span>
          </div>

          <div className="p-2 rounded bg-[#131b26] border border-[#1e2a3a]">
            <span className="text-[9px] text-slate-400 block">Available</span>
            <span className="text-xs font-bold text-white">1,158</span>
            <span className="text-[8px] text-slate-400 block mt-0.5">23% left</span>
          </div>

          <div className="p-2 rounded bg-[#131b26] border border-[#1e2a3a]">
            <span className="text-[9px] text-slate-400 block">Bookings</span>
            <span className="text-xs font-bold text-white">3,120</span>
            <span className="text-[8px] text-[#00e5be] block mt-0.5">+14%</span>
          </div>

          <div className="p-2 rounded bg-[#131b26] border border-[#1e2a3a]">
            <span className="text-[9px] text-slate-400 block">Revenue</span>
            <span className="text-xs font-bold text-[#00e5be]">₱1.24M</span>
            <span className="text-[8px] text-[#00e5be] block mt-0.5">+22%</span>
          </div>
        </div>

        {/* Graph + Recent Bookings */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 rounded bg-[#131b26] border border-[#1e2a3a]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-300">Ticket Sales Growth</span>
              <span className="text-[9px] text-[#00e5be] font-bold">+₱480K this week</span>
            </div>
            {/* SVG Glowing Line Chart */}
            <svg className="w-full h-14" viewBox="0 0 200 60" fill="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5be" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#00e5be" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 50 Q 30 45, 60 30 T 120 25 T 160 12 T 200 5 L 200 60 L 0 60 Z"
                fill="url(#chartGrad)"
              />
              <path
                d="M0 50 Q 30 45, 60 30 T 120 25 T 160 12 T 200 5"
                stroke="#00e5be"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="p-2.5 rounded bg-[#131b26] border border-[#1e2a3a]">
            <span className="text-[10px] font-semibold text-slate-300 block mb-1.5">
              Recent Bookings
            </span>
            <div className="space-y-1.5 text-[9px]">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-medium">Reynaldo A.</span>
                <span className="text-slate-400">2x VIP</span>
                <span className="text-[#00e5be] font-semibold">₱7,000</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-medium">Maria Santos</span>
                <span className="text-slate-400">1x GenAd</span>
                <span className="text-[#00e5be] font-semibold">₱1,300</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-medium">Joshua Tan</span>
                <span className="text-slate-400">4x GenAd</span>
                <span className="text-[#00e5be] font-semibold">₱5,200</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
