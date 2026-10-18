"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>("");

  const handleClick = (cat: CategoryItem) => {
    setActiveCategory(cat.id);
    if (onSelectCategory) onSelectCategory(cat);
    else {
      const types: Record<string, string> = { concerts: "Concert", festivals: "Festival", gigs: "Gig", theater: "Theater", sports: "Sports", comedy: "Comedy" };
      router.push(`/events?category=${encodeURIComponent(types[cat.id])}`);
    }
  };

  return (
    <section id="browse-categories" className="py-16 lg:py-24 scroll-mt-24 snap-section">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-16">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="text-[#66fcf1] text-xs font-bold tracking-[0.2em] uppercase block mb-1">
            EXPLORE
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Browse by Category
          </h2>
        </div>

        {/* 6 Category Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleClick(cat)}
                className={`flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl border transition-all duration-300 group text-center ${
                  isSelected
                    ? "bg-[#1f2833] border-[#66fcf1] shadow-[0_0_25px_rgba(102,252,241,0.35)] -translate-y-1"
                    : "bg-[#1f2833] border-[#2c3644] hover:border-[#66fcf1] hover:bg-[#16212f] hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(0,0,0,0.5),0_0_25px_rgba(102,252,241,0.25)]"
                }`}
              >
                {/* Icon box with glowing teal background */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 transition-all duration-300 ${
                    isSelected
                      ? "bg-[#66fcf1] text-[#0b0c10] shadow-[0_0_20px_rgba(102,252,241,0.5)] scale-105"
                      : "bg-[#102d33] border border-[#66fcf1]/40 text-[#66fcf1] group-hover:bg-[#66fcf1] group-hover:text-[#0b0c10] group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-[0_0_20px_rgba(102,252,241,0.5)]"
                  }`}
                >
                  <Icon className="w-6 h-6 stroke-[2]" />
                </div>

                {/* Category Name */}
                <span className="text-sm font-semibold text-slate-200 group-hover:text-[#66fcf1] transition-colors duration-200">
                  {cat.name}
                </span>

                {/* Count badge */}
                {cat.count && (
                  <span className="text-[11px] text-slate-400 mt-1 group-hover:text-slate-300 transition-colors">
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
