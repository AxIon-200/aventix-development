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
      author: "Reynaldo Abrigo",
      location: "Manila, PH",
      avatar: "/images/reynaldo.jpg",
    },
    {
      id: 2,
      rating: 5,
      review:
        "“Aventix has the best lineup of gigs around Cebu. I found small acoustic shows I never knew existed. Love the app's vibe!”",
      author: "Reyn Abrigo",
      location: "Cebu City, PH",
      avatar: "/images/reynaldo.jpg",
    },
    {
      id: 3,
      rating: 5,
      review:
        "“Secure payment and instant ticket delivery — exactly what I needed for a last-minute concert run. Highly recommend!”",
      author: "Rey Abrigo",
      location: "Davao City, PH",
      avatar: "/images/reynaldo.jpg",
    },
  ];

  return (
    <section className="py-20 bg-[#0d1219]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <span className="text-[#00e5be] text-xs font-bold tracking-[0.2em] uppercase block mb-1">
            ATTENDEE STORIES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            What Our Users Say
          </h2>
        </div>

        {/* 3 Testimonial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="bg-[#121a25] border border-[#1e2a39] rounded-2xl p-7 flex flex-col justify-between hover:border-[#00e5be]/40 transition-all duration-300 shadow-lg"
            >
              <div>
                {/* 5 Cyan Stars */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-[#00e5be] text-[#00e5be]"
                    />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-slate-300 text-sm leading-relaxed mb-6 font-normal">
                  {t.review}
                </p>
              </div>

              {/* Author Row */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#1a2737]">
                <div className="relative w-11 h-11 rounded-full overflow-hidden border border-[#00e5be]/30 shrink-0">
                  <Image
                    src={t.avatar}
                    alt={t.author}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">
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
