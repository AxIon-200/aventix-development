"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Check,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Plus,
  X,
  Ticket as TicketIcon,
  Sparkles,
  Info,
} from "lucide-react";
import InteractiveSeatMap, { type SelectedSeatInfo } from "./InteractiveSeatMap";
import ConfirmedETicket, { type ETicketData, DEFAULT_ETICKET_DATA } from "./ConfirmedETicket";

interface EventOption {
  id: string;
  name: string;
  genre: string;
  ageRestriction: string;
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  organizer: string;
  lineup: string[];
}

const AVAILABLE_EVENTS: EventOption[] = [
  {
    id: "neon-nights-2026",
    name: "Neon Nights: Live Sessions",
    genre: "Electronic / Techno",
    ageRestriction: "18+ Only",
    date: "Sat, Dec 5, 2026",
    time: "7:00 PM (22:00)",
    venueName: "The Astoria",
    venueAddress: "2/F Poblacion Strip, Makati City",
    organizer: "Soundwave PH",
    lineup: ["Charlotte de Witte", "Enrico Sangiuliano"],
  },
  {
    id: "puth-2026",
    name: "Charlie Puth - Whatever's Clever! World Tour",
    genre: "Pop / Live Concert",
    ageRestriction: "All Ages",
    date: "Oct 14, 2026",
    time: "19:30",
    venueName: "SM Mall of Asia Arena",
    venueAddress: "Seaside Blvd, Mall of Asia Complex, Pasay",
    organizer: "Live Nation Philippines",
    lineup: ["Charlie Puth"],
  },
  {
    id: "wte-2026",
    name: "wave to earth - The Pieces Tour",
    genre: "Indie / Alternative",
    ageRestriction: "All Ages",
    date: "Nov 15, 2026",
    time: "19:00",
    venueName: "SM Mall of Asia Arena",
    venueAddress: "Seaside Blvd, Mall of Asia Complex, Pasay",
    organizer: "Live Nation Philippines",
    lineup: ["wave to earth", "Milena"],
  },
];

const STEPS = [
  { id: 1, title: "Performance Details", subtitle: "Event info & lineup" },
  { id: 2, title: "Select Tickets", subtitle: "Tiers & quantity" },
  { id: 3, title: "Venue & Seats", subtitle: "Seat selection" },
  { id: 4, title: "Attendee & Payment", subtitle: "Checkout" },
  { id: 5, title: "Confirmed Booking", subtitle: "Digital pass" },
];

export default function InteractiveTicketFlow({
  initialEventId,
  initialCategory,
}: {
  initialEventId?: string;
  initialCategory?: string;
}) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId || "neon-nights-2026"
  );

  const selectedEvent =
    AVAILABLE_EVENTS.find((e) => e.id === selectedEventId) || AVAILABLE_EVENTS[0];

  // Performance details state (like Image 1)
  const [concertTitle, setConcertTitle] = useState(selectedEvent.name);
  const [genre, setGenre] = useState(selectedEvent.genre);
  const [ageRestriction, setAgeRestriction] = useState(selectedEvent.ageRestriction);
  const [eventDate, setEventDate] = useState("2026-12-05");
  const [eventTime, setEventTime] = useState("22:00");
  const [venueLocation, setVenueLocation] = useState(
    `${selectedEvent.venueName}, ${selectedEvent.venueAddress}`
  );
  const [lineup, setLineup] = useState<string[]>(selectedEvent.lineup);
  const [newGuestName, setNewGuestName] = useState("");
  const [isAddingGuest, setIsAddingGuest] = useState(false);

  // Update when selected event changes
  useEffect(() => {
    setConcertTitle(selectedEvent.name);
    setGenre(selectedEvent.genre);
    setAgeRestriction(selectedEvent.ageRestriction);
    setVenueLocation(`${selectedEvent.venueName}, ${selectedEvent.venueAddress}`);
    setLineup(selectedEvent.lineup);
  }, [selectedEvent]);

  // Ticket Tiers
  const ticketTiers = [
    {
      id: "vip",
      name: "VIP Pass",
      section: "Section A",
      price: 4500,
      perks: "Front center rows, fast-track entrance, VIP lounge & soundcheck access",
      remaining: 45,
      badge: "Most Popular",
    },
    {
      id: "patron",
      name: "Patron / Lower Box",
      section: "Section B",
      price: 2800,
      perks: "Prime elevated center sightline, padded stadium seating",
      remaining: 120,
    },
    {
      id: "balcony",
      name: "Balcony / Upper Box",
      section: "Section C",
      price: 1800,
      perks: "Panoramic stage view, reserved amphitheater row",
      remaining: 85,
    },
    {
      id: "ga",
      name: "General Admission",
      section: "Open Lawn / Floor",
      price: 1200,
      perks: "Standing floor area directly across the main sound rig",
      remaining: 350,
    },
  ];

  const [selectedTierId, setSelectedTierId] = useState<string>("vip");
  const [ticketQuantity, setTicketQuantity] = useState<number>(1);

  // Seat Selection (Section A, Row 5, Seat 12 like Image 2!)
  const [selectedSeat, setSelectedSeat] = useState<SelectedSeatInfo>({
    section: "Section A",
    row: 5,
    seat: 12,
    label: "Section A · Row 5 · Seat 12",
    tier: "VIP",
    price: 4500,
    gate: "Enter via Gate B",
  });

  // Attendee info
  const [ticketHolderName, setTicketHolderName] = useState("Jamie Dela Cruz");
  const [attendeeEmail, setAttendeeEmail] = useState("jamie.delacruz@soundwave.ph");
  const [attendeePhone, setAttendeePhone] = useState("+63 917 555 0123");
  const [paymentMethod, setPaymentMethod] = useState<"GCash" | "Maya" | "Card">("GCash");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Confirmed E-Ticket state
  const [eTicketData, setETicketData] = useState<ETicketData>(DEFAULT_ETICKET_DATA);

  // Add guest to lineup
  const handleAddGuest = () => {
    if (newGuestName.trim()) {
      setLineup([...lineup, newGuestName.trim()]);
      setNewGuestName("");
      setIsAddingGuest(false);
    }
  };

  const handleRemoveGuest = (index: number) => {
    setLineup(lineup.filter((_, i) => i !== index));
  };

  // Process checkout & transition to confirmation pass
  const handleConfirmBooking = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      const activeTier = ticketTiers.find((t) => t.id === selectedTierId) || ticketTiers[0];
      const now = new Date();
      const formattedDate = "Oct 2, 2026 09:42";
      const randomRef = `Ref GC-${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(100000 + Math.random() * 900000)}`;

      const confirmedData: ETicketData = {
        eventTitle: concertTitle,
        category: "CONCERT",
        organizer: selectedEvent.organizer,
        date: "Sat, Dec 5, 2026",
        time: "7:00 PM",
        doorsOpenTime: "Doors open 6:00 PM",
        venueName: selectedEvent.venueName,
        venueAddress: selectedEvent.venueAddress,
        ticketHolder: ticketHolderName || "Jamie Dela Cruz",
        ticketType: activeTier.name.includes("VIP") ? "VIP" : activeTier.name,
        seatInfo: selectedSeat.label,
        gateInfo: selectedSeat.gate || "Enter via Gate B",
        bookingRef: "BKG-9031",
        admitsText: `Ticket 1 of ${ticketQuantity}`,
        ticketId: "TKT-7F3K-92QD-XM41",
        priceFormatted: `PHP ${(selectedSeat.price * ticketQuantity).toLocaleString()}.00`,
        paymentMethod: `Paid with ${paymentMethod}`,
        paymentDate: formattedDate,
        paymentRef: randomRef,
        supportEmail: "help@soundwave.ph",
        supportPhone: "+63 917 555 0123",
      };

      setETicketData(confirmedData);

      // Save to localStorage so My Tickets immediately displays it
      try {
        const stored = localStorage.getItem("aventix_attendee_tickets");
        const list = stored ? JSON.parse(stored) : [];
        list.unshift({
          id: confirmedData.ticketId,
          eventTitle: confirmedData.eventTitle,
          tier: confirmedData.ticketType,
          date: confirmedData.date,
          venue: confirmedData.venueName,
          status: "confirmed",
          seat: confirmedData.seatInfo,
          price: confirmedData.priceFormatted,
        });
        localStorage.setItem("aventix_attendee_tickets", JSON.stringify(list));
      } catch {
        // storage fallback
      }

      setIsProcessingPayment(false);
      setCurrentStep(5);
    }, 1200);
  };

  const activeTier = ticketTiers.find((t) => t.id === selectedTierId) || ticketTiers[0];
  const totalAmount = selectedSeat.price * ticketQuantity;

  return (
    <div className="space-y-8">
      {/* Top Banner and Navigation */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Attendee Portal</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-semibold text-teal-400">Buy Tickets</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {currentStep === 5 ? "Confirmed Booking Pass" : "Buy Event Tickets"}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            {currentStep === 5
              ? "Your digital pass has been issued. Present this QR code at the venue gate for instant admission."
              : "Complete the step-by-step reservation, select your preferred numbered seats, and checkout."}
          </p>
        </div>

        {/* Selected Event Quick Dropdown */}
        {currentStep < 5 && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111622] px-3 py-2 text-xs">
            <span className="text-slate-400">Event:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-transparent font-medium text-teal-300 focus:outline-none"
            >
              {AVAILABLE_EVENTS.map((ev) => (
                <option key={ev.id} value={ev.id} className="bg-[#111622] text-white">
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Progress Bar (Matching Image 1 Flow) */}
      <div className="rounded-2xl border border-white/10 bg-[#111622] p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isClickable = step.id <= currentStep;

            return (
              <React.Fragment key={step.id}>
                {/* Step Item */}
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && setCurrentStep(step.id)}
                  className={`group flex items-center gap-2 sm:gap-3 text-left transition-all ${
                    isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isCompleted
                        ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                        : isCurrent
                          ? "border-2 border-[#2dd4bf] bg-teal-950/80 text-[#2dd4bf] shadow-[0_0_12px_#2dd4bf]"
                          : "border border-white/10 bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : step.id}
                  </div>

                  <div className="hidden md:block">
                    <p
                      className={`text-xs font-semibold ${
                        isCurrent
                          ? "text-[#2dd4bf]"
                          : isCompleted
                            ? "text-white"
                            : "text-slate-400"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-[10px] text-slate-500">{step.subtitle}</p>
                  </div>
                </button>

                {/* Connector Line */}
                {idx < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 transition-all ${
                      currentStep > idx + 1 ? "bg-teal-500" : "bg-white/10"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ================= STEP 1: PERFORMANCE DETAILS (EXACTLY MATCHING IMAGE 1) ================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column (7 cols): Card 1 & Card 2 */}
            <div className="space-y-6 lg:col-span-7">
              {/* Card 1: 1. Performance Details */}
              <div className="rounded-2xl border border-white/10 bg-[#111622] p-6 shadow-md">
                <h2 className="text-base font-bold text-white">1. Performance Details</h2>

                <div className="mt-5 space-y-4">
                  {/* Concert Title */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Concert Title
                    </label>
                    <input
                      type="text"
                      value={concertTitle}
                      onChange={(e) => setConcertTitle(e.target.value)}
                      placeholder="Enter high-energy headline name..."
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  {/* Genre / Category & Age Restriction */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-300">
                        Genre / Category
                      </label>
                      <select
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3.5 py-3 text-sm text-white transition focus:border-teal-400 focus:outline-none"
                      >
                        <option value="Electronic / Techno">Electronic / Techno</option>
                        <option value="Pop / Live Concert">Pop / Live Concert</option>
                        <option value="Indie / Alternative">Indie / Alternative</option>
                        <option value="Festival / Rave">Festival / Rave</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300">
                        Age Restriction
                      </label>
                      <select
                        value={ageRestriction}
                        onChange={(e) => setAgeRestriction(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3.5 py-3 text-sm text-white transition focus:border-teal-400 focus:outline-none"
                      >
                        <option value="18+ Only">18+ Only</option>
                        <option value="All Ages">All Ages</option>
                        <option value="16+ with Adult">16+ with Adult</option>
                        <option value="21+ VIP Only">21+ VIP Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: 2. Date & Venue */}
              <div className="rounded-2xl border border-white/10 bg-[#111622] p-6 shadow-md">
                <h2 className="text-base font-bold text-white">2. Date & Venue</h2>

                <div className="mt-5 space-y-4">
                  {/* Date & Time */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-300">
                        Date of Event
                      </label>
                      <div className="relative mt-1.5">
                        <input
                          type="text"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          placeholder="Oct 24, 2025"
                          className="w-full rounded-xl border border-white/10 bg-[#0B0F19] px-4 py-3 pl-10 text-sm text-white transition focus:border-teal-400 focus:outline-none"
                        />
                        <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300">
                        Start Time
                      </label>
                      <div className="relative mt-1.5">
                        <input
                          type="text"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          placeholder="22:00"
                          className="w-full rounded-xl border border-white/10 bg-[#0B0F19] px-4 py-3 pl-10 text-sm text-white transition focus:border-teal-400 focus:outline-none"
                        />
                        <Clock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* Venue Location */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Venue Location
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        type="text"
                        value={venueLocation}
                        onChange={(e) => setVenueLocation(e.target.value)}
                        placeholder="Type club name, arena, stadium or warehouse coordinates..."
                        className="w-full rounded-xl border border-white/10 bg-[#0B0F19] px-4 py-3 pl-10 text-sm text-white transition focus:border-teal-400 focus:outline-none"
                      />
                      <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Card 3 Artist Lineup & Card 4 Interactive Venue Builder */}
            <div className="space-y-6 lg:col-span-5">
              {/* Card 3: Artist Lineup */}
              <div className="rounded-2xl border border-white/10 bg-[#111622] p-6 shadow-md">
                <h2 className="text-base font-bold text-white">Artist Lineup</h2>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {lineup.map((artist, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0B0F19] px-3.5 py-1.5 text-xs font-medium text-slate-200"
                    >
                      <span>{artist}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveGuest(idx)}
                        className="text-slate-500 hover:text-white"
                        aria-label={`Remove ${artist}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}

                  {isAddingGuest ? (
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        autoFocus
                        value={newGuestName}
                        onChange={(e) => setNewGuestName(e.target.value)}
                        placeholder="Artist name..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddGuest();
                          if (e.key === "Escape") setIsAddingGuest(false);
                        }}
                        className="rounded-full border border-teal-500/40 bg-[#0B0F19] px-3 py-1 text-xs text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddGuest}
                        className="rounded-full bg-teal-500 px-2.5 py-1 text-[11px] font-bold text-slate-950"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingGuest(true)}
                      className="inline-flex items-center gap-1 rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-500/20"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Guest</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Card 4: Interactive Venue Builder (Exact match to Image 1 preview) */}
              <div className="rounded-2xl border border-white/10 bg-[#111622] p-6 shadow-md">
                <h2 className="text-base font-bold text-white">
                  Interactive Venue Builder
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Dynamic amphitheater seating rows and live stage perspective.
                </p>

                {/* Visual Seating Graphic like Image 1 */}
                <div className="relative mt-4 flex aspect-[16/9] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-teal-500/20 bg-[#070b14] p-4">
                  {/* Neon Grid Backdrop */}
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#152438_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

                  {/* Stage Glow */}
                  <div className="relative mb-2 flex flex-col items-center">
                    <div className="h-1.5 w-32 rounded-full bg-[#2dd4bf] shadow-[0_0_15px_#2dd4bf]" />
                    <span className="mt-1 font-mono text-[9px] font-bold uppercase tracking-widest text-teal-300">
                      STAGE
                    </span>
                  </div>

                  {/* Arc Seating Simulation (Red, Green, Blue) */}
                  <div className="flex flex-col items-center gap-1">
                    {/* VIP Arc (Red) */}
                    <div className="flex gap-1">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-2 w-3 rounded-sm bg-[#f43f5e]" />
                      ))}
                    </div>
                    {/* Patron Arc (Green) */}
                    <div className="flex gap-1">
                      {Array.from({ length: 14 }).map((_, i) => (
                        <div key={i} className="h-2 w-2.5 rounded-sm bg-[#10b981]" />
                      ))}
                    </div>
                    {/* Balcony Wings (Blue) */}
                    <div className="flex gap-1.5">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <div key={i} className="h-1.5 w-2 rounded-sm bg-[#38bdf8]" />
                      ))}
                    </div>
                  </div>

                  <p className="mt-3 font-mono text-[10px] text-teal-400">
                    Live Venue Ready · 420 Seats Available
                  </p>
                </div>

                {/* Configure Button */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-teal-500/40 bg-teal-500/10 py-3 text-xs font-semibold text-teal-300 transition hover:bg-teal-500/20"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Configure Ticket Rows & Live Seat Preview</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step 1 Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 text-xs font-bold text-slate-950 transition hover:bg-teal-400"
            >
              <span>Continue to Ticket Selection</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: TICKET SELECTION & QUANTITY ================= */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Ticket Tier Cards (8 cols) */}
            <div className="space-y-4 lg:col-span-8">
              <h2 className="text-lg font-bold text-white">Choose Ticket Tier</h2>
              <p className="text-xs text-slate-400">
                Select your desired admission category for {concertTitle}.
              </p>

              <div className="space-y-3">
                {ticketTiers.map((tier) => {
                  const isSelected = selectedTierId === tier.id;

                  return (
                    <div
                      key={tier.id}
                      onClick={() => {
                        setSelectedTierId(tier.id);
                        if (tier.id === "vip") {
                          setSelectedSeat({
                            section: "Section A",
                            row: 5,
                            seat: 12,
                            label: "Section A · Row 5 · Seat 12",
                            tier: "VIP",
                            price: 4500,
                            gate: "Enter via Gate B",
                          });
                        } else if (tier.id === "patron") {
                          setSelectedSeat({
                            section: "Section B",
                            row: 7,
                            seat: 10,
                            label: "Section B · Row 7 · Seat 10",
                            tier: "Patron",
                            price: 2800,
                            gate: "Enter via Gate C",
                          });
                        } else {
                          setSelectedSeat({
                            section: "Section C",
                            row: 10,
                            seat: 8,
                            label: "Section C · Row 10 · Seat 8",
                            tier: "Balcony",
                            price: 1800,
                            gate: "Enter via Gate D",
                          });
                        }
                      }}
                      className={`group cursor-pointer rounded-2xl border p-5 transition-all ${
                        isSelected
                          ? "border-[#2dd4bf] bg-teal-950/20 shadow-[0_0_20px_rgba(45,212,191,0.15)]"
                          : "border-white/10 bg-[#111622] hover:border-white/20"
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white">
                              {tier.name}
                            </h3>
                            {tier.badge && (
                              <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-bold text-teal-300">
                                {tier.badge}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{tier.perks}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs">
                            <span className="text-teal-400 font-medium">
                              {tier.section}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400">
                              Only {tier.remaining} tickets left
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:justify-center">
                          <p className="text-xl font-extrabold text-white">
                            PHP {tier.price.toLocaleString()}
                          </p>
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all ${
                              isSelected
                                ? "border-teal-400 bg-teal-400 text-slate-950"
                                : "border-white/20"
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Summary & Quantity (4 cols) */}
            <div className="space-y-4 lg:col-span-4">
              <div className="rounded-2xl border border-white/10 bg-[#111622] p-5 shadow-md">
                <h3 className="text-sm font-bold text-white">Order Summary</h3>

                {/* Quantity Stepper */}
                <div className="mt-4 flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-300">Quantity</p>
                    <p className="text-[11px] text-slate-500">Max 6 per booking</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-1.5">
                    <button
                      type="button"
                      disabled={ticketQuantity <= 1}
                      onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                      className="text-sm font-bold text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-bold text-white text-xs">
                      {ticketQuantity}
                    </span>
                    <button
                      type="button"
                      disabled={ticketQuantity >= 6}
                      onClick={() => setTicketQuantity(Math.min(6, ticketQuantity + 1))}
                      className="text-sm font-bold text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Subtotal Calculation */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>
                      {activeTier.name} x {ticketQuantity}
                    </span>
                    <span className="font-semibold text-white">
                      PHP {(activeTier.price * ticketQuantity).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Processing Fee</span>
                    <span className="text-emerald-400 font-semibold">Waived (0.00)</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-3 text-sm font-bold text-white">
                    <span>Estimated Total</span>
                    <span className="text-[#2dd4bf]">
                      PHP {totalAmount.toLocaleString()}.00
                    </span>
                  </div>
                </div>

                {/* Next CTA */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-3 text-xs font-bold text-slate-950 transition hover:bg-teal-400"
                >
                  <span>Select Numbered Seats</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Performance Details</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: VENUE & SEAT SELECTION ================= */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <InteractiveSeatMap
            selectedSeat={selectedSeat}
            onSeatSelect={(seat) => setSelectedSeat(seat)}
            selectedTier={activeTier.name}
          />

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Ticket Tiers</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 text-xs font-bold text-slate-950 transition hover:bg-teal-400"
            >
              <span>Proceed to Attendee Checkout</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: ATTENDEE & PAYMENT ================= */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Form & Payment Method (7 cols) */}
            <div className="space-y-6 lg:col-span-7">
              {/* Attendee Info Card */}
              <div className="rounded-2xl border border-white/10 bg-[#111622] p-6 shadow-md">
                <h2 className="text-base font-bold text-white">Attendee Information</h2>
                <p className="text-xs text-slate-400">
                  Ticket passes will be issued under this person&apos;s legal name.
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300">
                      Primary Ticket Holder Name
                    </label>
                    <input
                      type="text"
                      value={ticketHolderName}
                      onChange={(e) => setTicketHolderName(e.target.value)}
                      placeholder="Jamie Dela Cruz"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-4 py-3 text-sm text-white focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-300">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={attendeeEmail}
                        onChange={(e) => setAttendeeEmail(e.target.value)}
                        placeholder="jamie.delacruz@soundwave.ph"
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-4 py-3 text-sm text-white focus:border-teal-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300">
                        Mobile Phone Number
                      </label>
                      <input
                        type="tel"
                        value={attendeePhone}
                        onChange={(e) => setAttendeePhone(e.target.value)}
                        placeholder="+63 917 555 0123"
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-4 py-3 text-sm text-white focus:border-teal-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="rounded-2xl border border-white/10 bg-[#111622] p-6 shadow-md">
                <h2 className="text-base font-bold text-white">Select Payment Method</h2>
                <p className="text-xs text-slate-400">
                  Instant ticket issuance upon confirmation.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* GCash */}
                  <label
                    onClick={() => setPaymentMethod("GCash")}
                    className={`cursor-pointer rounded-xl border p-4 text-center transition-all ${
                      paymentMethod === "GCash"
                        ? "border-[#2dd4bf] bg-teal-950/30 text-teal-300"
                        : "border-white/10 bg-[#0B0F19] text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <span className="block text-sm font-bold">GCash</span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">
                      e-Wallet / QR
                    </span>
                  </label>

                  {/* Maya */}
                  <label
                    onClick={() => setPaymentMethod("Maya")}
                    className={`cursor-pointer rounded-xl border p-4 text-center transition-all ${
                      paymentMethod === "Maya"
                        ? "border-[#2dd4bf] bg-teal-950/30 text-teal-300"
                        : "border-white/10 bg-[#0B0F19] text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <span className="block text-sm font-bold">Maya</span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">
                      Direct Wallet
                    </span>
                  </label>

                  {/* Card */}
                  <label
                    onClick={() => setPaymentMethod("Card")}
                    className={`cursor-pointer rounded-xl border p-4 text-center transition-all ${
                      paymentMethod === "Card"
                        ? "border-[#2dd4bf] bg-teal-950/30 text-teal-300"
                        : "border-white/10 bg-[#0B0F19] text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <span className="block text-sm font-bold">Credit / Debit</span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">
                      Visa / Mastercard
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Order Final Summary (5 cols) */}
            <div className="space-y-4 lg:col-span-5">
              <div className="rounded-2xl border border-white/10 bg-[#111622] p-6 shadow-md">
                <h3 className="text-sm font-bold text-white">Booking Review</h3>

                <div className="mt-4 space-y-3 divide-y divide-white/10 text-xs">
                  <div className="pb-3">
                    <p className="font-semibold text-white">{concertTitle}</p>
                    <p className="text-slate-400">{selectedEvent.venueName}</p>
                    <p className="text-slate-400">{selectedEvent.date}</p>
                  </div>

                  <div className="py-3 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Allocated Seat:</span>
                      <span className="font-semibold text-teal-300">
                        {selectedSeat.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Entrance:</span>
                      <span className="text-slate-300">{selectedSeat.gate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tier:</span>
                      <span className="text-slate-300">{selectedSeat.tier}</span>
                    </div>
                  </div>

                  <div className="pt-3 space-y-2">
                    <div className="flex justify-between text-slate-300">
                      <span>Total Amount</span>
                      <span className="text-base font-extrabold text-[#2dd4bf]">
                        PHP {totalAmount.toLocaleString()}.00
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Payment method: {paymentMethod}
                    </p>
                  </div>
                </div>

                {/* Confirm & Pay Button */}
                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handleConfirmBooking}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-3.5 text-xs font-bold text-slate-950 transition hover:bg-teal-400 disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    <span>Issuing Digital Pass…</span>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Confirm & Pay PHP {totalAmount.toLocaleString()}.00</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Seat Selection</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 5: CONFIRMED BOOKING PASS (EXACTLY MATCHING IMAGE 2) ================= */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <ConfirmedETicket
            data={eTicketData}
            showActions={true}
            onBookAnother={() => setCurrentStep(1)}
          />
        </div>
      )}
    </div>
  );
}
