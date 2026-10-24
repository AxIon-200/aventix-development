"use client";

import React from "react";
import Image from "next/image";
import { Star } from "lucide-react";

export default function Testimonials() {
  const testimonials = [
    {
      id: 1,
      rating: 5,
      review:
        "“Booking my festival ticket took less than 2 minutes. The QR ticket scanned instantly at the gate — no hassle at all!”",
      author: "Mika Santos",
      location: "Manila, PH",
      avatar: "/images/reynaldo.jpg",
    },
    {
      id: 2,
      rating: 5,
      review:
        "“Aventix has the best lineup of gigs around Cebu. I found small acoustic shows I never knew existed. Love the app's vibe!”",
      author: "Paolo Reyes",
      location: "Cebu City, PH",
      avatar: "/images/bosstigas.png",
    },
    {
      id: 3,
      rating: 5,
      review:
        "“Secure payment and instant ticket delivery — exactly what I needed for a last-minute concert run. Highly recommend!”",
      author: "Aira Dela Cruz",
      location: "Davao City, PH",
      avatar: "/images/mscaloocan.jpg",
    },
  ];

  return (
    <section id="testimonials" className="py-16 lg:py-24 bg-[#1f2833]/40 scroll-mt-24 snap-section">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-16">
        {/* Section Header */}
        <div className="text-center mb-14">
          <span className="text-[#66fcf1] text-xs font-bold tracking-[0.2em] uppercase block mb-1">
            ATTENDEE STORIES
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            What Our Users Say
          </h2>
        </div>

        {/* 3 Testimonial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="bg-[#1f2833] border border-[#2c3644] rounded-2xl p-7 flex flex-col justify-between hover:border-[#66fcf1] hover:-translate-y-2 hover:shadow-[0_15px_35px_rgba(0,0,0,0.5),0_0_25px_rgba(102,252,241,0.15)] transition-all duration-300 shadow-lg group"
            >
              <div>
                {/* 5 Cyan Stars */}
                <div className="flex items-center gap-1 mb-4 group-hover:scale-105 transition-transform duration-300 origin-left">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-[#66fcf1] text-[#66fcf1] drop-shadow-[0_0_6px_rgba(102,252,241,0.5)]"
                    />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-slate-300 text-sm leading-relaxed mb-6 font-normal group-hover:text-white transition-colors duration-200">
                  {t.review}
                </p>
              </div>

              {/* Author Row */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#1a2737]">
                <div className="relative w-11 h-11 rounded-full overflow-hidden border border-[#66fcf1]/30 group-hover:border-[#66fcf1] shrink-0 transition-colors duration-300">
                  <Image
                    src={t.avatar}
                    alt={t.author}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-[#66fcf1] leading-tight transition-colors duration-200">
                    {t.author}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
