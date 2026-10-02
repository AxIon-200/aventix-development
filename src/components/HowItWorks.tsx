"use client";

import React from "react";
import { Search, CreditCard, QrCode } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      step: "1",
      icon: Search,
      title: "Discover Events",
      description:
        "Browse thousands of concerts, festivals, and gigs happening across the Philippines.",
    },
    {
      step: "2",
      icon: CreditCard,
      title: "Book & Pay Securely",
      description:
        "Choose your seats and pay safely through our encrypted checkout system.",
    },
    {
      step: "3",
      icon: QrCode,
      title: "Get Digital Ticket",
      description:
        "Receive your QR-coded e-ticket instantly and flash it at the venue entrance.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-[#0d1219]/60 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-[#00e5be] text-xs font-bold tracking-[0.2em] uppercase block mb-1">
            SIMPLE PROCESS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            How It Works
          </h2>
        </div>

        {/* 3 Step Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="flex flex-col items-center text-center group"
              >
                {/* Glowing Circular Icon with Number Badge */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-[#111924] border-2 border-[#00e5be] flex items-center justify-center text-[#00e5be] shadow-[0_0_30px_rgba(0,229,190,0.35)] group-hover:shadow-[0_0_45px_rgba(0,229,190,0.6)] group-hover:scale-105 transition-all duration-300">
                    <Icon className="w-8 h-8 stroke-[1.8]" />
                  </div>

                  {/* Top-Right Number Badge */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#00e5be] text-[#091519] font-extrabold text-xs flex items-center justify-center shadow-md">
                    {item.step}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-2.5">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-400 max-w-xs leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
