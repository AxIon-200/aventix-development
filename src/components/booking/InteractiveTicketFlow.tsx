"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { publicBookingClient, bookingErrorMessage } from "@/lib/booking/client";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Check,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import InteractiveSeatMap from "./InteractiveSeatMap";

import { isCategoryBookable, categoryStateLabel } from "@/lib/event-booking";
import type { EventDetails, EventSeat } from "@/types/event";
import type { TicketOptions } from "@/lib/booking/types";

const STEPS = [
  { id: 1, title: "Performance Details", subtitle: "Event info & lineup" },
  { id: 2, title: "Select Tickets", subtitle: "Tiers & quantity" },
  { id: 3, title: "Venue & Seats", subtitle: "Seat selection" },
  { id: 4, title: "Attendee & Payment", subtitle: "Checkout" },
  { id: 5, title: "Confirmed Booking", subtitle: "Digital pass" },
];

export interface BookingAttendee {
  userId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
}

export default function InteractiveTicketFlow({
  events,
  initialEventId,
  initialCategory,
  attendee,
}: {
  events: EventDetails[];
  initialEventId?: string;
  initialCategory?: string;
  attendee?: BookingAttendee | null;
}) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedEventId, setSelectedEventId] = useState(
    events.find((event) => event.id === initialEventId)?.id ?? events[0]?.id ?? ""
  );
  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const concertTitle = selectedEvent?.name ?? "";
  // The API maps eventType to type and artistPerformer to performers.
  const genre = selectedEvent?.type ?? "";
  const lineup = selectedEvent?.performers ?? [];
  const artistPerformer = lineup.join(", ");
  const eventDate = selectedEvent
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric",
      }).format(new Date(selectedEvent.startsAt))
    : "";
  const eventTime = selectedEvent
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: true,
      }).format(new Date(selectedEvent.startsAt))
    : "";
  const venueLocation = selectedEvent
    ? [selectedEvent.venue.name, selectedEvent.venue.address].filter(Boolean).join(", ")
    : "";

  const ticketTiers = selectedEvent?.categories ?? [];
  const [selectedTierId, setSelectedTierId] = useState(initialCategory ?? "");
  const activeTier = ticketTiers.find((tier) =>
    tier.id === selectedTierId && selectedEvent && isCategoryBookable(selectedEvent, tier)
  ) ?? ticketTiers.find((tier) => selectedEvent && isCategoryBookable(selectedEvent, tier));
  const [requestedQuantity, setTicketQuantity] = useState(1);
  const [allowance, setAllowance] = useState<TicketOptions | null>(null);
  const [allowanceError, setAllowanceError] = useState("");
  const [allowanceRefresh, setAllowanceRefresh] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!selectedEventId || !attendee?.userId) return;
    publicBookingClient.getTicketOptions!(selectedEventId).then(options => {
      if (!cancelled) { setAllowance(options); setAllowanceError(""); }
    }).catch(error => {
      if (!cancelled) { setAllowance(null); setAllowanceError(bookingErrorMessage(error)); }
    });
    return () => { cancelled = true; };
  }, [selectedEventId, attendee?.userId, allowanceRefresh]);
  const currentAllowance = allowance?.event.id === selectedEventId && attendee?.userId ? allowance : null;
  const remainingAllowance = currentAllowance
    ? Math.max(0, currentAllowance.purchaseLimit - currentAllowance.confirmedQuantity - currentAllowance.heldQuantity)
    : 0;
  const maxQuantity = activeTier ? Math.min(6, activeTier.remaining ?? 6, remainingAllowance) : 0;
  const ticketQuantity = Math.min(requestedQuantity, maxQuantity);
  const [seatSelection, setSelectedSeats] = useState<EventSeat[]>([]);
  const availableSeats = activeTier?.seats ?? [];
  const requiresSeats = activeTier?.admissionMode === "ASSIGNED_SEATING";
  const selectedSeats = seatSelection.filter((seat) => availableSeats.some((available) => available.id === seat.id)).slice(0, ticketQuantity);
  const seatsComplete = !requiresSeats || (ticketQuantity > 0 && selectedSeats.length === ticketQuantity);
  const handleSeatToggle = (seat: EventSeat) => {
    if (!availableSeats.some((available) => available.id === seat.id)) return;
    setSelectedSeats((current) => {
      const valid = current.filter((item) => availableSeats.some((available) => available.id === item.id)).slice(0, ticketQuantity);
      return valid.some((item) => item.id === seat.id)
        ? valid.filter((item) => item.id !== seat.id)
        : valid.length < ticketQuantity ? [...valid, seat] : valid;
    });
  };
  const handleQuantityChange = (delta: number) => {
    setTicketQuantity((quantity) => maxQuantity > 0 ? Math.max(1, Math.min(maxQuantity, quantity + delta)) : 0);
    setSelectedSeats([]);
  };
  const totalAmount = (activeTier?.price ?? 0) * ticketQuantity;

  // Attendee info
  const ticketHolderName = attendee?.name ?? "";
  const attendeeEmail = attendee?.email ?? "";
  const attendeePhone = attendee?.phoneNumber ?? "";
  const [paymentMethod, setPaymentMethod] = useState<"GCash" | "Maya" | "Card">("GCash");
  const router = useRouter();
  const [isProcessingPayment, setProcessingPayment] = useState(false);
  const checkoutBusy = useRef(false);
  const checkoutOperation = useRef<{ fingerprint: string; key: string; bookingId?: string } | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");

  const handleConfirmBooking = async () => {
    if (!selectedEvent || !activeTier || ticketQuantity < 1 || !seatsComplete || checkoutBusy.current) return;
    if (!attendee?.userId) { setPaymentMessage("Sign in as an attendee before starting checkout."); return; }
    checkoutBusy.current = true;
    setProcessingPayment(true);
    setPaymentMessage("");
    const draft = { version: 1 as const, eventId: selectedEvent.id, items: [{ ticketCategoryId: activeTier.id,
      quantity: ticketQuantity, seatIds: selectedSeats.map(seat => seat.id) }] };
    const fingerprint = JSON.stringify(draft);
    if (checkoutOperation.current?.bookingId) {
      router.push('/bookings/' + checkoutOperation.current.bookingId + '/payment');
      return;
    }
    if (checkoutOperation.current?.fingerprint !== fingerprint) checkoutOperation.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const booking = await publicBookingClient.createBooking!(draft, checkoutOperation.current!.key);
      checkoutOperation.current!.bookingId = booking.id;
      router.push('/bookings/' + booking.id + '/payment?method=' + (paymentMethod === "Maya" ? "paymaya" : paymentMethod === "Card" ? "card" : "gcash"));
    } catch (error) {
      setPaymentMessage(bookingErrorMessage(error));
      setAllowanceRefresh(value => value + 1);
      checkoutBusy.current = false;
      setProcessingPayment(false);
    }
  };


  if (!selectedEvent) {
    return <p role="status" className="rounded-xl border border-white/10 bg-[#111622] p-6 text-slate-300">
      No concerts are available. Please check again later.
    </p>;
  }

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
              ? "Your demo pass is ready. This simulation does not grant event admission."
              : "Complete the step-by-step reservation, select your preferred numbered seats, and checkout."}
          </p>
        </div>


      </div>

      {/* Progress Bar (Matching Image 1 Flow) */}
      <div className="rounded-2xl border border-white/10 bg-[#111622] p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isClickable = !isProcessingPayment && (currentStep === 5 ? step.id === 5 : step.id <= currentStep && (step.id < 4 || seatsComplete));

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
                    <label htmlFor="concert-title" className="block text-xs font-medium text-slate-300">
                      Concert Title
                    </label>
                    <select
                      id="concert-title"
                      value={selectedEventId}
                      onChange={(e) => {
                        setSelectedEventId(e.target.value);
                        setSelectedTierId("");
                        setTicketQuantity(1);
                        setSelectedSeats([]);
                      }}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-4 py-3 text-sm text-white transition focus:border-teal-400 focus:outline-none"
                    >
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Genre / Category & Artist Performer */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="event-category" className="block text-xs font-medium text-slate-300">
                        Genre / Category
                      </label>
                      <input
                        id="event-category"
                        type="text"
                        value={genre}
                        readOnly
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3.5 py-3 text-sm text-slate-300"
                      />
                    </div>

                    <div>
                      <label htmlFor="artist-performer" className="block text-xs font-medium text-slate-300">
                        Artist Performer
                      </label>
                      <input
                        id="artist-performer"
                        type="text"
                        value={artistPerformer}
                        readOnly
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-3.5 py-3 text-sm text-slate-300"
                      />
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
                      <label htmlFor="eventDate" className="block text-xs font-medium text-slate-300">
                        Date of Event
                      </label>
                      <div className="relative mt-1.5">
                        <input
                          type="text"
                          id="eventDate"
                          value={eventDate}
                          readOnly
                          className="w-full rounded-xl border border-white/10 bg-[#0B0F19] px-4 py-3 pl-10 text-sm text-white transition focus:border-teal-400 focus:outline-none"
                        />
                        <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="eventTime" className="block text-xs font-medium text-slate-300">
                        Start Time
                      </label>
                      <div className="relative mt-1.5">
                        <input
                          type="text"
                          id="eventTime"
                          value={eventTime}
                          readOnly
                          className="w-full rounded-xl border border-white/10 bg-[#0B0F19] px-4 py-3 pl-10 text-sm text-white transition focus:border-teal-400 focus:outline-none"
                        />
                        <Clock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* Venue Location */}
                  <div>
                    <label htmlFor="venueLocation" className="block text-xs font-medium text-slate-300">
                      Venue Location
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        type="text"
                        id="venueLocation"
                        value={venueLocation}
                        readOnly
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

                    </span>
                  ))}


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
                  disabled={!activeTier || ticketQuantity < 1}
                  onClick={() => { if (activeTier && ticketQuantity > 0) setCurrentStep(3); }}
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
                {ticketTiers.length === 0 && (
                  <p role="status" className="text-sm text-slate-400">No ticket tiers have been listed for this concert.</p>
                )}
                {ticketTiers.map((tier) => {
                  const isSelected = activeTier?.id === tier.id;
                  const isAvailable = isCategoryBookable(selectedEvent, tier);

                  return (
                    <button
                      type="button"
                      key={tier.id}
                      aria-pressed={isSelected}
                      disabled={!isAvailable}
                      onClick={() => {
                        if (!isAvailable) return;
                        setSelectedTierId(tier.id);
                        setTicketQuantity(1);
                        setSelectedSeats([]);
                      }}
                      className={`group w-full rounded-2xl border p-5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
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

                          </div>
                          <p className="mt-1 text-xs text-slate-400">{tier.description}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs">
                            <span className="text-teal-400 font-medium">
                              {isAvailable ? "Available" : categoryStateLabel(selectedEvent, tier)}
                            </span>
                            {tier.remaining !== undefined && (
                              <span className="text-slate-400">{tier.remaining} tickets left</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:justify-center">
                          <p className="text-xl font-extrabold text-white">
                            PHP {tier.price.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    </button>
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
                    <p className="text-[11px] text-slate-500">
                      {currentAllowance ? `Max ${maxQuantity} per booking` : "Checking purchase allowance…"}
                    </p>
                    {activeTier?.remaining !== undefined && (
                      <p role="status" className="mt-1 text-[11px] text-slate-400">
                        {activeTier.remaining} {activeTier.remaining === 1 ? "ticket" : "tickets"} available
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-1.5">
                    <button
                      type="button"
                      aria-label="Decrease ticket quantity"
                      disabled={ticketQuantity <= 1}
                      onClick={() => handleQuantityChange(-1)}
                      className="text-sm font-bold text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-bold text-white text-xs">
                      {ticketQuantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase ticket quantity"
                      disabled={!activeTier || ticketQuantity >= maxQuantity}
                      onClick={() => handleQuantityChange(1)}
                      className="text-sm font-bold text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div role="status" className="mt-3 text-xs text-slate-400">
                  {!attendee?.userId ? "Sign in as an attendee to check your purchase allowance." : allowanceError ? (
                    <>{allowanceError} <button type="button" className="text-teal-300 underline" onClick={() => setAllowanceRefresh(value => value + 1)}>Retry</button></>
                  ) : currentAllowance ? (
                    <>
                      <p>Event limit: {currentAllowance.purchaseLimit} per attendee. Confirmed: {currentAllowance.confirmedQuantity}. Active holds: {currentAllowance.heldQuantity}. You can select {remainingAllowance} more.</p>
                      {currentAllowance.heldQuantity > 0 && <Link className="text-teal-300 underline" href="/dashboard/booking-history">Review your existing bookings to resume payment or cancel an unpaid reservation.</Link>}
                    </>
                  ) : "Loading your current purchase allowance…"}
                </div>

                {/* Subtotal Calculation */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>
                      {activeTier?.name ?? "No available tier"} x {ticketQuantity}
                    </span>
                    <span className="font-semibold text-white">
                      PHP {totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Processing Fee</span>
                    <span className="text-emerald-400 font-semibold">Waived (0.00)</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-3 text-sm font-bold text-white">
                    <span>Estimated Total</span>
                    <span className="text-[#2dd4bf]">
                      PHP {totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Next CTA */}
                <button
                  type="button"
                  disabled={!activeTier || ticketQuantity < 1}
                  onClick={() => { if (activeTier && ticketQuantity > 0) setCurrentStep(3); }}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-3 text-xs font-bold text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
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
            seats={availableSeats}
            selectedSeats={selectedSeats}
            quantity={ticketQuantity}
            tierName={activeTier?.name ?? ""}
            ticketPrice={activeTier?.price ?? 0}
            requiresSeats={requiresSeats}
            onSeatToggle={handleSeatToggle}
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
              disabled={!activeTier || !seatsComplete}
              onClick={() => { if (activeTier && seatsComplete) setCurrentStep(4); }}
              className="flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 text-xs font-bold text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
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
                  {attendee ? "These details come from your attendee account and cannot be changed here." : "Sign in to display your attendee information."}
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="ticket-holder-name" className="block text-xs font-medium text-slate-300">
                      Primary Ticket Holder Name
                    </label>
                    <input
                      type="text"
                      id="ticket-holder-name"
                      value={ticketHolderName}
                      readOnly
                      placeholder="Not available"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-4 py-3 text-sm text-white focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="attendee-email" className="block text-xs font-medium text-slate-300">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="attendee-email"
                        value={attendeeEmail}
                        readOnly
                        placeholder="Not available"
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0B0F19] px-4 py-3 text-sm text-white focus:border-teal-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="attendee-phone" className="block text-xs font-medium text-slate-300">
                        Mobile Phone Number
                      </label>
                      <input
                        type="tel"
                        id="attendee-phone"
                        value={attendeePhone}
                        readOnly
                        placeholder="Not provided"
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
                  PayMongo test checkout. No real money will be charged.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* GCash */}
                  <button
                    type="button"
                    aria-pressed={paymentMethod === "GCash"}
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
                  </button>

                  {/* Maya */}
                  <button
                    type="button"
                    aria-pressed={paymentMethod === "Maya"}
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
                  </button>

                  {/* Card */}
                  <button
                    type="button"
                    aria-pressed={paymentMethod === "Card"}
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
                  </button>
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
                    <p className="mt-1 text-slate-400">{artistPerformer}</p>
                    <p className="mt-1 text-slate-400">{venueLocation}</p>
                    <p className="mt-1 text-slate-400">{eventDate} · {eventTime}</p>
                  </div>

                  <div className="py-3 space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Tier:</span>
                      <span className="text-right text-slate-300">{activeTier?.name}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Ticket quantity:</span>
                      <span className="text-slate-300">{ticketQuantity}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Price per ticket:</span>
                      <span className="text-slate-300">PHP {(activeTier?.price ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pt-2">
                      <p className="text-slate-400">{requiresSeats ? `Selected seats (${selectedSeats.length}):` : "Admission:"}</p>
                      {requiresSeats ? (
                        <ul className="mt-2 space-y-1 text-teal-300">
                          {selectedSeats.map((seat) => <li key={seat.id}>{seat.label}</li>)}
                        </ul>
                      ) : <p className="mt-1 text-teal-300">General admission</p>}
                    </div>
                  </div>

                  <div className="pt-3 space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal ({ticketQuantity} × PHP {(activeTier?.price ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                      <span>PHP {totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Processing Fee</span><span className="text-emerald-400">Waived (0.00)</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Total Amount</span>
                      <span className="text-base font-extrabold text-[#2dd4bf]">
                        PHP {totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Payment method: {paymentMethod}
                    </p>
                  </div>
                </div>

                {paymentMessage && <p role="status" className="mt-4 text-sm text-amber-300">{paymentMessage}</p>}
                {/* Confirm & Pay Button */}
                <button
                  type="button"
                  disabled={isProcessingPayment || !activeTier || ticketQuantity < 1 || !seatsComplete}
                  onClick={handleConfirmBooking}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-3.5 text-xs font-bold text-slate-950 transition hover:bg-teal-400 disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    <span>Issuing Digital Pass…</span>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Continue to PayMongo test checkout · PHP {totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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


    </div>
  );
}
