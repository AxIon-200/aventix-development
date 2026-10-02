"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrendingEvents, { EventItem } from "@/components/TrendingEvents";
import BrowseCategory, { CategoryItem } from "@/components/BrowseCategory";
import HowItWorks from "@/components/HowItWorks";
import WhyChooseUs from "@/components/WhyChooseUs";
import Testimonials from "@/components/Testimonials";
import OrganizerBanner from "@/components/OrganizerBanner";
import Footer from "@/components/Footer";
import BookingModal from "@/components/BookingModal";
import AuthModal from "@/components/AuthModal";
import OrganizerModal from "@/components/OrganizerModal";

export default function Home() {
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [organizerModalOpen, setOrganizerModalOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  const handleOpenAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleSearchSubmit = (filters: { query: string; location: string; date: string }) => {
    // Smooth scroll to events and could filter
    const element = document.getElementById("trending-events");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f15] text-slate-100 flex flex-col font-sans selection:bg-[#00e5be] selection:text-[#0a1518]">
      {/* Top Navbar */}
      <Navbar
        onOpenAuth={handleOpenAuth}
        onSearch={(q) => {
          const element = document.getElementById("trending-events");
          if (element) element.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {/* Main Landing Page Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <Hero
          onSearchSubmit={handleSearchSubmit}
          onExploreClick={() => {
            const element = document.getElementById("trending-events");
            if (element) element.scrollIntoView({ behavior: "smooth" });
          }}
        />

        {/* Section 1: Trending Events */}
        <TrendingEvents
          onSelectEvent={(event) => setSelectedEvent(event)}
          onViewAll={() => {
            const element = document.getElementById("trending-events");
            if (element) element.scrollIntoView({ behavior: "smooth" });
          }}
        />

        {/* Section 2: Browse by Category */}
        <BrowseCategory
          onSelectCategory={(cat: CategoryItem) => {
            setActiveCategoryFilter(cat.name);
          }}
        />

        {/* Section 3: How It Works */}
        <HowItWorks />

        {/* Section 4: Why Choose Aventix */}
        <WhyChooseUs />

        {/* Section 5: Attendee Stories / Testimonials */}
        <Testimonials />

        {/* Section 6: Are You an Organizer Banner */}
        <OrganizerBanner
          onBecomeOrganizer={() => setOrganizerModalOpen(true)}
        />
      </main>

      {/* Footer */}
      <Footer />

      {/* Interactive Modals */}
      <BookingModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />

      <OrganizerModal
        isOpen={organizerModalOpen}
        onClose={() => setOrganizerModalOpen(false)}
      />
    </div>
  );
}
