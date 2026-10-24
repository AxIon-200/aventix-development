"use client";

import type { EventSeat } from "@/types/event";
import { Check, Sparkles } from "lucide-react";

interface InteractiveSeatMapProps {
  seats: EventSeat[];
  selectedSeats: EventSeat[];
  quantity: number;
  tierName: string;
  ticketPrice: number;
  onSeatToggle: (seat: EventSeat) => void;
  requiresSeats: boolean;
}

export default function InteractiveSeatMap({
  seats, selectedSeats, quantity, tierName, ticketPrice, onSeatToggle, requiresSeats,
}: InteractiveSeatMapProps) {
  const rows = new Map<string, EventSeat[]>();
  for (const seat of seats) {
    const label = [seat.section, "Row " + seat.row].filter(Boolean).join(" · ");
    rows.set(label, [...(rows.get(label) ?? []), seat]);
  }
  const seatColor = /vip|preferred/i.test(tierName) ? "#f43f5e"
    : /patron|lower/i.test(tierName) ? "#10b981" : "#38bdf8";
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0F1420] p-4 shadow-xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">Interactive Venue Map</span>
          <h2 className="mt-1 text-lg font-bold text-white">Live Seat Selector</h2>
          <p className="mt-1 text-sm font-medium text-slate-200">{tierName}</p>
          <p className="mt-1 text-xs text-slate-400">
            {requiresSeats ? "Select one seat per ticket. Select a seat again to remove it." : "This ticket tier does not require numbered seats."}
          </p>
        </div>
        <div className="text-right text-sm text-teal-300" role="status" aria-live="polite">
          <p>Ticket quantity: {quantity}</p>
          {requiresSeats && <p className="font-bold">Selected seats: {selectedSeats.length} / {quantity}</p>}
        </div>
      </div>
      {requiresSeats && <>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <p>{seats.length} seats available</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: seatColor }} />Available</span>
            <span className="flex items-center gap-1.5 text-teal-300"><span className="h-3 w-3 rounded-full bg-teal-400 ring-1 ring-white" />Selected</span>
          </div>
        </div>
        <div className="relative mt-5 overflow-hidden rounded-xl border border-white/5 bg-[#0B101B]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1b2c40_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />
          <div className="relative flex flex-col items-center px-4 pb-7 pt-8">
            <div className="pointer-events-none absolute top-1 h-24 w-72 rounded-full bg-teal-500/10 blur-2xl" />
            <div className="h-2 w-64 max-w-full rounded-full bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_20px_#2dd4bf]" />
            <div className="mt-2 flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-950/60 px-5 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-teal-300">
              <Sparkles className="h-3 w-3" />STAGE / DJ BOOTH<Sparkles className="h-3 w-3" />
            </div>
            <p className="mt-2 text-[10px] text-slate-500">Live Sound &amp; Lighting Rig</p>
          </div>
        {seats.length === 0 && <p role="status" className="py-6 text-sm text-slate-300">No seats are currently available for this tier.</p>}
        <div className="relative max-h-[520px] overflow-auto px-4 pb-8 pt-1">
          <div className="mx-auto flex w-max min-w-full flex-col items-center gap-5">
          {Array.from(rows, ([label, row], rowIndex) => (
            <div key={label} className="flex items-center gap-3 px-2" role="group" aria-label={label}>
              <span className="w-7 text-right font-mono text-[10px] text-slate-500">R{row[0]?.row}</span>
              <div className="flex items-center" style={{ gap: Math.min(8, 3 + rowIndex * 0.5) }}>
                {row.map((seat, seatIndex) => {
                  const selected = selectedSeats.some((item) => item.id === seat.id);
                  const position = row.length > 1 ? (seatIndex / (row.length - 1)) * 2 - 1 : 0;
                  return <button
                    key={seat.id}
                    type="button"
                    aria-label={seat.label}
                    aria-pressed={selected}
                    title={seat.label}
                    disabled={!selected && selectedSeats.length >= quantity}
                    onClick={() => onSeatToggle(seat)}
                    style={{ transform: `translateY(${8 * (1 - position * position)}px)`, backgroundColor: selected ? "#2dd4bf" : seatColor }}
                    className={"flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-slate-950 transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300 disabled:cursor-not-allowed disabled:opacity-40 " + (selected ? "ring-2 ring-white shadow-[0_0_12px_#2dd4bf]" : "opacity-80 hover:opacity-100 hover:ring-2 hover:ring-white/40")}
                  >
                    {selected ? <Check className="h-3 w-3 stroke-[3]" /> : seat.seatNumber}
                  </button>;
                })}
              </div>
              <span className="w-7 font-mono text-[10px] text-slate-500">R{row[0]?.row}</span>
            </div>
          ))}
          </div>
        </div>
        </div>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-teal-500/30 bg-teal-950/20 p-4">
          <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-teal-300"><Check className="h-4 w-4" />Selected seats ({selectedSeats.length})</p>
          <p className="mt-2 text-xs text-slate-300">{selectedSeats.map((seat) => seat.label).join("; ") || "No seats selected yet."}</p>
          {selectedSeats.length < quantity && <p className="mt-2 text-xs text-slate-400">Select {quantity - selectedSeats.length} more {quantity - selectedSeats.length === 1 ? "seat" : "seats"} to continue.</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Ticket Tier Price</p>
            <p className="mt-1 text-lg font-black text-teal-300">{ticketPrice.toLocaleString("en-PH", { style: "currency", currency: "PHP" })}</p>
          </div>
        </div>
      </>}
    </div>
  );
}
