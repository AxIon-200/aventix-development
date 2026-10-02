"use client";

import React, { useState } from "react";
import {
  Music,
  PartyPopper,
  Guitar,
  Drama,
  Trophy,
  Mic,
} from "lucide-react";

export interface CategoryItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: string;
}

const CATEGORIES: CategoryItem[] = [
  { id: "concerts", name: "Concerts", icon: Music, count: "48+ Events" },
  { id: "festivals", name: "Festivals", icon: PartyPopper, count: "16+ Events" },
  { id: "gigs", name: "Gigs", icon: Guitar, count: "72+ Events" },
  { id: "theater", name: "Theater", icon: Drama, count: "24+ Events" },
  { id: "sports", name: "Sports", icon: Trophy, count: "30+ Events" },
  { id: "comedy", name: "Comedy", icon: Mic, count: "18+ Events" },
];

interface BrowseCategoryProps {
  onSelectCategory?: (category: CategoryItem) => void;
}

export default function BrowseCategory({ onSelectCategory }: BrowseCategoryProps) {
  const [activeCategory, setActiveCategory] = useState<string>("concerts");

  const handleClick = (cat: CategoryItem) => {
    setActiveCategory(cat.id);
    if (onSelectCategory) onSelectCategory(cat);
  };

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10">
          <span className="text-[#00e5be] text-xs font-bold tracking-[0.2em] uppercase block mb-1">
            EXPLORE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Browse by Category
          </h2>
        </div>

        {/* 6 Category Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => handleClick(cat)}
                className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 group text-center ${
                  isSelected
                    ? "bg-[#182333] border-[#00e5be] shadow-[0_0_25px_rgba(0,229,190,0.25)]"
                    : "bg-[#121a25] border-[#1e2a39] hover:border-[#00e5be]/50 hover:bg-[#16212f]"
                }`}
              >
                {/* Icon box with glowing teal background */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 transition-all duration-300 ${
                    isSelected
                      ? "bg-[#00e5be] text-[#091519] shadow-[0_0_20px_rgba(0,229,190,0.5)]"
                      : "bg-[#102d33] border border-[#00e5be]/40 text-[#00e5be] group-hover:bg-[#00e5be] group-hover:text-[#091519] group-hover:shadow-[0_0_15px_rgba(0,229,190,0.4)]"
                  }`}
                >
                  <Icon className="w-6 h-6 stroke-[2]" />
                </div>

                {/* Category Name */}
                <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
