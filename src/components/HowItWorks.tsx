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
    <section id="how-it-works" className="py-16 lg:py-24 bg-[#1f2833]/40 scroll-mt-24 snap-section">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-16">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-[#66fcf1] text-xs font-bold tracking-[0.2em] uppercase block mb-1">
            SIMPLE PROCESS
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            How It Works
          </h2>
        </div>

        {/* 3 Step Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="flex flex-col items-center text-center group p-8 rounded-2xl border border-[#2c3644] bg-[#121c27]/60 hover:bg-[#121c27] hover:border-[#66fcf1]/50 hover:-translate-y-2 hover:shadow-[0_15px_35px_rgba(0,0,0,0.5),0_0_25px_rgba(102,252,241,0.15)] transition-all duration-300"
              >
                {/* Glowing Circular Icon with Number Badge */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-[#111924] border-2 border-[#66fcf1] flex items-center justify-center text-[#66fcf1] shadow-[0_0_30px_rgba(102,252,241,0.35)] group-hover:shadow-[0_0_45px_rgba(102,252,241,0.7)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <Icon className="w-8 h-8 stroke-[1.8]" />
                  </div>

                  {/* Top-Right Number Badge */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#66fcf1] text-[#0b0c10] font-extrabold text-xs flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    {item.step}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-2.5 group-hover:text-[#66fcf1] transition-colors duration-200">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-400 max-w-xs leading-relaxed font-normal group-hover:text-slate-300 transition-colors">
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
