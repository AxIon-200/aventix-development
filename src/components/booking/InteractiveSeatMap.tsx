"use client";

import React, { useState } from "react";
import { Check, Info, Sparkles } from "lucide-react";

export interface SelectedSeatInfo {
  section: string;
  row: number;
  seat: number;
  label: string;
  tier: string;
  price: number;
  gate: string;
}

interface InteractiveSeatMapProps {
  selectedSeat: SelectedSeatInfo;
  onSeatSelect: (seat: SelectedSeatInfo) => void;
  selectedTier?: string;
}

export default function InteractiveSeatMap({
  selectedSeat,
  onSeatSelect,
  selectedTier = "VIP",
}: InteractiveSeatMapProps) {
  const [hoveredSeat, setHoveredSeat] = useState<SelectedSeatInfo | null>(null);

  // Generate amphitheater seating arrangement
  // Section A (VIP): Rows 1 to 5 (Red / Coral)
  // Section B (Patron): Rows 6 to 9 (Emerald Green)
  // Section C (Balcony): Rows 10 to 12 (Sky Blue)

  const rows = [
    { rowNumber: 1, count: 12, tier: "VIP", section: "Section A", price: 4500, gate: "Gate A", color: "#f43f5e" },
    { rowNumber: 2, count: 14, tier: "VIP", section: "Section A", price: 4500, gate: "Gate A", color: "#f43f5e" },
    { rowNumber: 3, count: 16, tier: "VIP", section: "Section A", price: 4500, gate: "Gate B", color: "#f43f5e" },
    { rowNumber: 4, count: 18, tier: "VIP", section: "Section A", price: 4500, gate: "Gate B", color: "#f43f5e" },
    { rowNumber: 5, count: 20, tier: "VIP", section: "Section A", price: 4500, gate: "Gate B", color: "#f43f5e" },
    { rowNumber: 6, count: 22, tier: "Patron", section: "Section B", price: 2800, gate: "Gate C", color: "#10b981" },
    { rowNumber: 7, count: 24, tier: "Patron", section: "Section B", price: 2800, gate: "Gate C", color: "#10b981" },
    { rowNumber: 8, count: 26, tier: "Patron", section: "Section B", price: 2800, gate: "Gate C", color: "#10b981" },
    { rowNumber: 9, count: 26, tier: "Patron", section: "Section B", price: 2800, gate: "Gate C", color: "#10b981" },
    { rowNumber: 10, count: 28, tier: "Balcony", section: "Section C", price: 1800, gate: "Gate D", color: "#38bdf8" },
    { rowNumber: 11, count: 28, tier: "Balcony", section: "Section C", price: 1800, gate: "Gate D", color: "#38bdf8" },
  ];

  // Specific booked seats to look realistic
  const bookedSeatKeys = new Set([
    "1-4", "1-5", "2-7", "2-8", "3-2", "3-3", "4-10", "4-11", "5-5", "5-6", "5-18",
    "6-12", "6-13", "7-4", "7-5", "8-15", "9-8", "9-9", "10-2", "11-14", "11-15"
  ]);

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-[#0F1420] p-4 sm:p-6 shadow-xl">
      {/* Header and Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
            Interactive Venue Map
          </span>
          <h3 className="text-lg font-bold text-white">Live Seat Selector</h3>
          <p className="text-xs text-slate-400">
            Click on any available seat row to allocate your pass
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#f43f5e]" />
            <span>VIP (Sec A)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#10b981]" />
            <span>Patron (Sec B)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#38bdf8]" />
            <span>Balcony (Sec C)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-slate-700" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full bg-[#2dd4bf] ring-2 ring-white" />
            <span className="font-bold text-[#2dd4bf]">Selected</span>
          </div>
        </div>
      </div>

      {/* Stage Visualizer & Seating Arc */}
      <div className="relative mt-4 flex flex-col items-center justify-center overflow-x-auto py-6">
        {/* Glow behind stage */}
        <div className="pointer-events-none absolute top-4 h-24 w-80 rounded-full bg-teal-500/10 blur-2xl" />

        {/* Stage Curved Bar */}
        <div className="relative mb-6 flex flex-col items-center">
          <div className="h-2 w-72 rounded-full bg-gradient-to-r from-transparent via-[#2dd4bf] to-transparent shadow-[0_0_20px_#2dd4bf]" />
          <div className="mt-1 flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-950/60 px-6 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-teal-300 backdrop-blur-md">
            <Sparkles className="h-3 w-3" />
            STAGE / DJ BOOTH
            <Sparkles className="h-3 w-3" />
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Live Sound & Lighting Rig</p>
        </div>

        {/* Curved Seat Rows */}
        <div className="flex flex-col items-center gap-2">
          {rows.map((row) => {
            return (
              <div
                key={row.rowNumber}
                className="flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <span className="w-6 text-right font-mono text-[10px] font-semibold text-slate-500">
                  R{row.rowNumber}
                </span>

                <div className="flex items-center gap-1 sm:gap-1.5">
                  {Array.from({ length: row.count }).map((_, idx) => {
                    const seatNum = idx + 1;
                    const key = `${row.rowNumber}-${seatNum}`;
                    const isBooked = bookedSeatKeys.has(key);
                    const isSelected =
                      selectedSeat.row === row.rowNumber &&
                      selectedSeat.seat === seatNum;

                    let bgStyle = "bg-slate-800 hover:bg-slate-700";
                    let ringStyle = "";

                    if (isBooked) {
                      bgStyle = "bg-slate-800/50 cursor-not-allowed opacity-40";
                    } else if (isSelected) {
                      bgStyle = "bg-[#2dd4bf] text-slate-950 scale-125 shadow-[0_0_12px_#2dd4bf]";
                      ringStyle = "ring-2 ring-white";
                    } else if (row.tier === "VIP") {
                      bgStyle = "bg-[#f43f5e]/80 hover:bg-[#f43f5e] hover:scale-110";
                    } else if (row.tier === "Patron") {
                      bgStyle = "bg-[#10b981]/80 hover:bg-[#10b981] hover:scale-110";
                    } else {
                      bgStyle = "bg-[#38bdf8]/80 hover:bg-[#38bdf8] hover:scale-110";
                    }

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={isBooked}
                        title={`Row ${row.rowNumber}, Seat ${seatNum} (${row.tier}) - PHP ${row.price.toLocaleString()}`}
                        onClick={() => {
                          if (!isBooked) {
                            onSeatSelect({
                              section: row.section,
                              row: row.rowNumber,
                              seat: seatNum,
                              label: `${row.section} · Row ${row.rowNumber} · Seat ${seatNum}`,
                              tier: row.tier,
                              price: row.price,
                              gate: row.gate,
                            });
                          }
                        }}
                        onMouseEnter={() => {
                          if (!isBooked) {
                            setHoveredSeat({
                              section: row.section,
                              row: row.rowNumber,
                              seat: seatNum,
                              label: `${row.section} · Row ${row.rowNumber} · Seat ${seatNum}`,
                              tier: row.tier,
                              price: row.price,
                              gate: row.gate,
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredSeat(null)}
                        className={`h-4 w-4 sm:h-4.5 sm:w-4.5 rounded-full transition-all duration-150 flex items-center justify-center text-[8px] font-bold ${bgStyle} ${ringStyle}`}
                      >
                        {isSelected ? (
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <span className="w-6 text-left font-mono text-[10px] font-semibold text-slate-500">
                  R{row.rowNumber}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Seat Summary Pill Box */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-teal-500/30 bg-teal-950/20 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-[#2dd4bf]">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-400">
              Selected Seat Allocation
            </p>
            <p className="text-sm font-bold text-white">
              {hoveredSeat ? hoveredSeat.label : selectedSeat.label}
            </p>
            <p className="text-xs text-slate-400">
              {hoveredSeat ? hoveredSeat.gate : selectedSeat.gate} • Sightline: Center Stage Clear View
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-400">Ticket Tier Price</p>
          <p className="text-lg font-black text-[#2dd4bf]">
            PHP {(hoveredSeat ? hoveredSeat.price : selectedSeat.price).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
