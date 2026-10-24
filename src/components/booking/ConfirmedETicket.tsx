"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { CheckCircle2, Download, Printer, ArrowLeft, Ticket } from "lucide-react";
import QRCodeSVG from "./QRCodeSVG";

export interface ETicketData {
  simulation?: boolean;
  eventTitle: string;
  category: string;
  organizer: string;
  date: string;
  time: string;
  doorsOpenTime?: string;
  venueName: string;
  venueAddress: string;
  ticketHolder: string;
  ticketType: string;
  seatInfo: string;
  gateInfo: string;
  bookingRef: string;
  admitsText: string;
  ticketId: string;
  priceFormatted: string;
  paymentMethod: string;
  paymentDate: string;
  paymentRef: string;
  supportEmail?: string;
  supportPhone?: string;
}

export const DEFAULT_ETICKET_DATA: ETicketData = {
  eventTitle: "Neon Nights: Live Sessions",
  category: "CONCERT",
  organizer: "Soundwave PH",
  date: "Sat, Dec 5, 2026",
  time: "7:00 PM",
  doorsOpenTime: "Doors open 6:00 PM",
  venueName: "The Astoria",
  venueAddress: "2/F Poblacion Strip, Makati City",
  ticketHolder: "Jamie Dela Cruz",
  ticketType: "VIP",
  seatInfo: "Section A · Row 5 · Seat 12",
  gateInfo: "Enter via Gate B",
  bookingRef: "BKG-9031",
  admitsText: "Ticket 1 of 2",
  ticketId: "TKT-7F3K-92QD-XM41",
  priceFormatted: "PHP 4,500.00",
  paymentMethod: "Paid with GCash",
  paymentDate: "Oct 2, 2026 09:42",
  paymentRef: "Ref GC-70331-951189",
  supportEmail: "help@soundwave.ph",
  supportPhone: "+63 917 555 0123",
};

export default function ConfirmedETicket({
  data = DEFAULT_ETICKET_DATA,
  showActions = true,
  onBookAnother,
}: {
  data?: ETicketData;
  showActions?: boolean;
  onBookAnother?: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center justify-center py-4">
      {/* Ticket Container */}
      <div
        ref={printRef}
        className="w-full max-w-[620px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0B0F19] text-white shadow-2xl shadow-cyan-950/40"
      >
        {data.simulation && <p className="bg-amber-400 px-6 py-3 text-center text-sm font-bold text-slate-950">DEMO PASS — No payment charged. Not valid for admission.</p>}
        {/* Ticket Header (Dark Navy / Black) */}
        <div className="relative overflow-hidden bg-[#0a101d] px-8 pt-8 pb-7">
          {/* Top Brand Bar */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-black tracking-[0.25em] text-[#2dd4bf]">
              AVENTIX
            </span>
            <div className="text-right">
              <span className="block text-[11px] font-semibold tracking-wider text-slate-400">
                E-TICKET
              </span>
              <span className="block text-xs font-bold tracking-wider text-[#2dd4bf]">
                ADMIT ONE
              </span>
            </div>
          </div>

          {/* Decorative Diagonal Stripes on Top Right */}
          <div className="pointer-events-none absolute right-8 top-12 flex gap-1.5 opacity-20">
            <div className="h-16 w-1.5 -rotate-[24deg] rounded-full bg-cyan-400" />
            <div className="h-16 w-1.5 -rotate-[24deg] rounded-full bg-cyan-400" />
            <div className="h-16 w-1.5 -rotate-[24deg] rounded-full bg-cyan-400" />
            <div className="h-16 w-1.5 -rotate-[24deg] rounded-full bg-cyan-400" />
          </div>

          {/* Event Category Badge */}
          <div className="mt-4">
            <span className="inline-block rounded-full border border-[#2dd4bf] px-3.5 py-0.5 text-[11px] font-bold tracking-widest text-[#2dd4bf]">
              {data.category}
            </span>
          </div>

          {/* Event Title */}
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {data.eventTitle}
          </h1>

          {/* Organizer */}
          <p className="mt-1 text-base font-semibold text-[#2dd4bf]">
            {data.organizer}
          </p>
        </div>

        {/* Ticket Body (White Card) */}
        <div className="bg-white text-slate-900">
          {/* Main Info Section */}
          <div className="grid grid-cols-1 gap-6 p-7 sm:grid-cols-12 sm:gap-8 sm:p-8">
            {/* Left Details Column (7 cols) */}
            <div className="space-y-4 sm:col-span-7">
              {/* Date & Time Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-slate-400">
                    DATE
                  </p>
                  <p className="mt-0.5 text-base font-bold text-slate-900">
                    {data.date}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-slate-400">
                    TIME
                  </p>
                  <p className="mt-0.5 text-base font-bold text-slate-900">
                    {data.time}
                  </p>
                  {data.doorsOpenTime && (
                    <p className="text-[11px] text-slate-500">
                      {data.doorsOpenTime}
                    </p>
                  )}
                </div>
              </div>

              {/* Venue */}
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400">
                  VENUE
                </p>
                <p className="mt-0.5 text-base font-bold text-slate-900">
                  {data.venueName}
                </p>
                <p className="text-[11px] text-slate-500">{data.venueAddress}</p>
              </div>

              {/* Ticket Holder */}
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400">
                  TICKET HOLDER
                </p>
                <p className="mt-0.5 text-lg font-bold text-slate-900 sm:text-xl">
                  {data.ticketHolder}
                </p>
              </div>

              {/* Ticket Type & Seat */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-slate-400">
                    TICKET TYPE
                  </p>
                  <p className="mt-0.5 text-base font-bold text-slate-900">
                    {data.ticketType}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-slate-400">
                    SEAT / ADMISSION
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {data.seatInfo}
                  </p>
                  <p className="text-[11px] text-slate-500">{data.gateInfo}</p>
                </div>
              </div>

              {/* Booking Ref & Admits */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-slate-400">
                    BOOKING REFERENCE
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">
                    {data.bookingRef}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-slate-400">
                    ADMITS
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {data.admitsText}
                  </p>
                </div>
              </div>
            </div>

            {/* Right QR Code Column (5 cols) */}
            <div className="flex flex-col items-center justify-center sm:col-span-5">
              <div className="flex w-full flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-center">
                <p className="text-[10px] font-bold tracking-[0.18em] text-slate-600 uppercase">
                  SCAN AT THE GATE
                </p>
                <div className="my-3 flex items-center justify-center rounded-lg bg-white p-2 shadow-sm">
                  <QRCodeSVG value={data.ticketId} className="h-40 w-40" />
                </div>
                <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                  TICKET ID
                </p>
                <p className="mt-0.5 font-mono text-sm font-bold tracking-wider text-slate-900">
                  {data.ticketId}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Valid for one entry
                </p>
              </div>
            </div>
          </div>

          {/* Perforated Divider with Circular Notches */}
          <div className="relative flex items-center justify-center">
            {/* Left Notch */}
            <div className="absolute -left-3.5 h-7 w-7 rounded-full bg-[#0B0F19]" />
            {/* Dashed Line */}
            <div className="w-full border-b-2 border-dashed border-slate-200 mx-5" />
            {/* Right Notch */}
            <div className="absolute -right-3.5 h-7 w-7 rounded-full bg-[#0B0F19]" />
          </div>

          {/* Bottom Confirmation & Entry Instructions */}
          <div className="grid grid-cols-1 gap-5 p-7 sm:grid-cols-12 sm:p-8">
            {/* Payment Box (5 cols) */}
            <div className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-[#E8F7F0] p-4 sm:col-span-5 sm:p-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 fill-emerald-600 text-white" />
                  <span>PAYMENT CONFIRMED</span>
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {data.priceFormatted}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {data.paymentMethod}
                </p>
              </div>
              <div className="mt-3 text-[11px] text-slate-500">
                <p>{data.paymentDate}</p>
                <p className="font-mono">{data.paymentRef}</p>
              </div>
            </div>

            {/* Entry Instructions (7 cols) */}
            <div className="sm:col-span-7">
              <p className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                ENTRY INSTRUCTIONS
              </p>
              <ol className="mt-2.5 space-y-2 text-xs leading-relaxed text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                    1
                  </span>
                  <span>
                    Show this QR code at the gate, printed or on your phone,
                    with screen brightness turned up.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                    2
                  </span>
                  <span>
                    Bring a valid photo ID that matches the ticket holder&apos;s
                    name.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                    3
                  </span>
                  <span>
                    Doors open at 6:00 PM. Arrive early to avoid queues.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                    4
                  </span>
                  <span>
                    This code works once. Please don&apos;t share it or post it
                    online.
                  </span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Ticket Legal & Contact Footer */}
        <div className="border-t border-white/10 bg-[#080d18] px-7 py-5 text-[11px] text-slate-400">
          <p className="font-medium text-slate-300">
            Organizer: {data.organizer} · Support: {data.supportEmail} |{" "}
            {data.supportPhone}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            Tickets are non-transferable and non-refundable, except if the event
            is cancelled. Re-entry is not permitted once you have left the venue.
            No outside food or drinks, professional cameras, or weapons. The
            organizer may refuse entry. Programme and timing may change without
            notice.
          </p>
          <p className="mt-2 text-[10px] text-slate-500">
            Issued by Aventix for {data.organizer}. Keep this ticket private.{" "}
            <span className="font-mono text-slate-400">{data.ticketId}</span>
          </p>
        </div>
      </div>

      {/* Action Buttons Below Ticket */}
      {showActions && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-teal-400"
          >
            <Printer className="h-4 w-4" />
            <span>Print / Save PDF</span>
          </button>

          <Link
            href="/dashboard/tickets"
            className="flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/10 px-5 py-2.5 text-xs font-semibold text-teal-300 transition hover:bg-teal-500/20"
          >
            <Ticket className="h-4 w-4" />
            <span>View in My Tickets</span>
          </Link>

          {onBookAnother && (
            <button
              type="button"
              onClick={onBookAnother}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/80 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700"
            >
              <span>Book Another Ticket</span>
            </button>
          )}

          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </Link>
        </div>
      )}
    </div>
  );
}
