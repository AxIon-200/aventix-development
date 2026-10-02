"use client";

import React from "react";
import { Shield, Ticket, CheckCircle2, Headphones } from "lucide-react";

export default function WhyChooseUs() {
  const features = [
    {
      icon: Shield,
      title: "Secure Payments",
      description:
        "Bank-level encryption keeps every transaction safe and protected.",
    },
    {
      icon: Ticket,
      title: "Instant Digital Tickets",
      description:
        "No printing needed — get your e-ticket delivered right after checkout.",
    },
    {
      icon: CheckCircle2,
      title: "Verified Organizers",
      description:
        "Every event listed is vetted so you can book with full confidence.",
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description:
        "Our team is always on standby to help with any booking issues.",
    },
  ];

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <span className="text-[#00e5be] text-xs font-bold tracking-[0.2em] uppercase block mb-1">
            TRUSTED PLATFORM
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Why Choose Aventix
          </h2>
        </div>

        {/* 4 Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-[#121a25] border border-[#1e2a39] rounded-2xl p-7 text-center flex flex-col items-center hover:border-[#00e5be]/40 hover:bg-[#16212f] transition-all duration-300 group shadow-lg"
              >
                {/* Solid Cyan Icon Badge */}
                <div className="w-14 h-14 rounded-2xl bg-[#00e5be] text-[#091519] flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(0,229,190,0.3)] group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(0,229,190,0.5)] transition-all">
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#00e5be] transition-colors">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-400 leading-relaxed font-normal">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
