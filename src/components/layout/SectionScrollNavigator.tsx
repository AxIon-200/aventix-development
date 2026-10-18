"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { ChevronDown } from "lucide-react";

export interface SectionItem {
  id: string;
  label: string;
}

const SECTIONS: SectionItem[] = [
  { id: "hero-section", label: "Overview" },
  { id: "trending-events", label: "Trending Events" },
  { id: "browse-categories", label: "Categories" },
  { id: "how-it-works", label: "How It Works" },
  { id: "why-choose-us", label: "Why Aventix" },
  { id: "testimonials", label: "User Reviews" },
  { id: "organizer-cta", label: "Organizers" },
];

export default function SectionScrollNavigator() {
  const [activeSection, setActiveSection] = useState<string>("hero-section");
  const isScrollingRef = useRef<boolean>(false);
  const lastScrollTimeRef = useRef<number>(0);
  const activeSectionRef = useRef<string>("hero-section");

  // Keep ref in sync for event listeners
  activeSectionRef.current = activeSection;

  // Smoothly scroll to a section by ID, taking into account the sticky navbar height (80px)
  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    isScrollingRef.current = true;
    lastScrollTimeRef.current = Date.now();
    setActiveSection(id);
    activeSectionRef.current = id;

    const navbarHeight = 80;
    const bodyRect = document.body.getBoundingClientRect().top;
    const elementRect = el.getBoundingClientRect().top;
    const elementPosition = elementRect - bodyRect;
    const offsetPosition = Math.max(0, elementPosition - (id === "hero-section" ? 0 : navbarHeight));

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });

    // Release scroll lock after smooth transition animation finishes
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 900);
  }, []);

  // Jump to next or previous section
  const scrollToNext = useCallback(() => {
    const currentIndex = SECTIONS.findIndex((s) => s.id === activeSectionRef.current);
    if (currentIndex < SECTIONS.length - 1) {
      scrollToSection(SECTIONS[currentIndex + 1].id);
    }
  }, [scrollToSection]);

  const scrollToPrev = useCallback(() => {
    const currentIndex = SECTIONS.findIndex((s) => s.id === activeSectionRef.current);
    if (currentIndex > 0) {
      scrollToSection(SECTIONS[currentIndex - 1].id);
    }
  }, [scrollToSection]);

  // Track active section as user scrolls
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach((section) => {
      const el = document.getElementById(section.id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !isScrollingRef.current) {
              setActiveSection(section.id);
              activeSectionRef.current = section.id;
            }
          });
        },
        {
          rootMargin: "-25% 0px -40% 0px",
          threshold: 0.1,
        }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  // Auto-scroll to specific sections on Wheel scroll (down and up)
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let accumulatedDelta = 0;
    let resetDeltaTimer: NodeJS.Timeout | null = null;

    function handleWheel(e: WheelEvent) {
      // Don't intercept when focusing or scrolling inside interactive form inputs
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.closest(".no-auto-scroll")
      ) {
        return;
      }

      // During active smooth transition or cooldown, ignore extra wheel ticks
      const now = Date.now();
      if (isScrollingRef.current || now - lastScrollTimeRef.current < 850) {
        return;
      }

      accumulatedDelta += e.deltaY;

      if (resetDeltaTimer) clearTimeout(resetDeltaTimer);
      resetDeltaTimer = setTimeout(() => {
        accumulatedDelta = 0;
      }, 180);

      const THRESHOLD = 50; // Responsive threshold for smooth section triggering

      if (accumulatedDelta > THRESHOLD) {
        // Scrolled down -> autoscroll to next section
        accumulatedDelta = 0;
        const currentIndex = SECTIONS.findIndex((s) => s.id === activeSectionRef.current);
        if (currentIndex < SECTIONS.length - 1) {
          scrollToSection(SECTIONS[currentIndex + 1].id);
        }
      } else if (accumulatedDelta < -THRESHOLD) {
        // Scrolled up -> autoscroll to previous section
        accumulatedDelta = 0;
        const currentIndex = SECTIONS.findIndex((s) => s.id === activeSectionRef.current);
        if (currentIndex > 0) {
          scrollToSection(SECTIONS[currentIndex - 1].id);
        }
      }
    }

    // Touch gesture support (swipe up to advance down, swipe down to return up)
    let touchStartY = 0;
    function handleTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0].clientY;
    }

    function handleTouchEnd(e: TouchEvent) {
      if (window.innerWidth < 1024) return;
      const now = Date.now();
      if (isScrollingRef.current || now - lastScrollTimeRef.current < 850) return;

      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;

      if (Math.abs(deltaY) > 80) {
        if (deltaY > 0) {
          scrollToNext();
        } else {
          scrollToPrev();
        }
      }
    }

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      if (resetDeltaTimer) clearTimeout(resetDeltaTimer);
    };
  }, [scrollToNext, scrollToPrev, scrollToSection]);

  return (
    <>
      {/* Floating Section Navigation Dots (Right Edge) */}
      <nav
        aria-label="Page sections navigation"
        className="fixed right-5 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-center gap-2.5 bg-[#0e1622]/85 backdrop-blur-md px-2 py-3 rounded-full border border-white/10 shadow-2xl transition-all duration-300"
      >
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              aria-label={`Scroll to ${section.label}`}
              aria-current={isActive ? "true" : undefined}
              className="group relative flex items-center justify-center p-1.5 focus:outline-none"
            >
              {/* Tooltip on hover */}
              <span className="pointer-events-none absolute right-9 whitespace-nowrap rounded-lg bg-[#121c27] border border-white/10 px-2.5 py-1 text-xs font-semibold text-white shadow-xl opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                {section.label}
              </span>

              {/* Dot indicator */}
              <span
                className={`block rounded-full transition-all duration-300 ${
                  isActive
                    ? "w-2.5 h-6 bg-[#66fcf1] shadow-[0_0_14px_#66fcf1]"
                    : "w-2.5 h-2.5 bg-slate-600 group-hover:bg-slate-300 group-hover:scale-125"
                }`}
              />
            </button>
          );
        })}
      </nav>

      {/* Floating 'Next Section' button on bottom right */}
      {activeSection !== "organizer-cta" && (
        <button
          type="button"
          onClick={scrollToNext}
          aria-label="Scroll to next section"
          className="fixed bottom-6 right-6 z-30 hidden sm:flex items-center gap-2 rounded-full bg-[#121c27]/90 border border-[#66fcf1]/40 px-4 py-2 text-xs font-semibold text-[#66fcf1] shadow-[0_0_25px_rgba(102,252,241,0.25)] backdrop-blur-md hover:bg-[#66fcf1] hover:text-[#0b0c10] hover:scale-105 active:scale-95 transition-all duration-300 group"
        >
          <span>Next Section</span>
          <ChevronDown className="h-4 w-4 stroke-[2.5] animate-bounce transition-transform duration-300 group-hover:translate-y-0.5" />
        </button>
      )}
    </>
  );
}
