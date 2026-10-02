"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, Calendar, MapPin, CheckCircle, ShieldCheck, QrCode } from "lucide-react";
import { EventItem } from "./TrendingEvents";

interface BookingModalProps {
  event: EventItem | null;
  onClose: () => void;
}

export default function BookingModal({ event, onClose }: BookingModalProps) {
  const [selectedTier, setSelectedTier] = useState<string>("genad");
  const [quantity, setQuantity] = useState<number>(1);
  const [step, setStep] = useState<"select" | "success">("select");
  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "maya" | "card">("gcash");

  if (!event) return null;

  const tiers: Record<string, { name: string; price: number }> = {
    genad: { name: "General Admission", price: 2200 },
    vip: { name: "VIP Standing", price: 4500 },
    svip: { name: "SVIP with Soundcheck", price: 7800 },
  };

  const totalPrice = tiers[selectedTier].price * quantity;

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0e1622] border border-[#213145] rounded-3xl overflow-hidden shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[#182332] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {step === "select" ? (
          <div>
            {/* Header with Event Image Preview */}
            <div className="relative h-44 w-full bg-[#141d29]">
              <Image
                src={event.imageUrl}
                alt={event.title}
                fill
                className="object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e1622] via-[#0e1622]/60 to-transparent" />
              <div className="absolute bottom-4 left-6 right-6">
                <span className="text-[11px] font-bold text-[#00e5be] tracking-wider uppercase">
                  {event.artist}
                </span>
                <h3 className="text-xl font-extrabold text-white leading-tight">
                  {event.title}
                </h3>
                <div className="flex items-center gap-4 text-xs text-slate-300 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#00e5be]" /> {event.month}{" "}
                    {event.day}, {event.year}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#00e5be]" /> {event.venue}
                  </span>
                </div>
              </div>
            </div>

            {/* Selection Form */}
            <form onSubmit={handleCheckout} className="p-6 space-y-5">
              {/* Ticket Tier Options */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Select Ticket Tier
                </label>
                <div className="space-y-2">
                  {Object.entries(tiers).map(([key, tier]) => (
                    <div
                      key={key}
                      onClick={() => setSelectedTier(key)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedTier === key
                          ? "bg-[#182637] border-[#00e5be] shadow-[0_0_15px_rgba(0,229,190,0.15)]"
                          : "bg-[#131b26] border-[#1e2c3e] hover:border-[#2b3e55]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            selectedTier === key
                              ? "border-[#00e5be] bg-[#00e5be]"
                              : "border-slate-500"
                          }`}
                        >
                          {selectedTier === key && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#091519]" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {tier.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Instant QR E-Ticket Delivery
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#00e5be]">
                        ₱{tier.price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#131b26] border border-[#1e2c3e]">
                <span className="text-sm font-medium text-slate-300">
                  Number of Tickets
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg bg-[#1a2638] text-white hover:bg-[#22334b] flex items-center justify-center font-bold text-base"
                  >
                    -
                  </button>
                  <span className="text-white font-bold text-base w-6 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(6, quantity + 1))}
                    className="w-8 h-8 rounded-lg bg-[#00e5be] text-[#091519] hover:bg-[#38f2cf] flex items-center justify-center font-bold text-base"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "gcash", label: "GCash" },
                    { id: "maya", label: "Maya" },
                    { id: "card", label: "Card" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaymentMethod(p.id as any)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        paymentMethod === p.id
                          ? "bg-[#182637] border-[#00e5be] text-[#00e5be]"
                          : "bg-[#131b26] border-[#1e2c3e] text-slate-400 hover:text-white"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total & Submit Button */}
              <div className="pt-2 border-t border-[#1c2a3b] flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 block">Total Amount</span>
                  <span className="text-xl font-extrabold text-white">
                    ₱{totalPrice.toLocaleString()}
                  </span>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-[#00e5be] hover:bg-[#36f0cc] text-[#091519] font-extrabold text-sm transition-all shadow-[0_0_20px_rgba(0,229,190,0.35)] hover:scale-105 active:scale-95"
                >
                  Confirm &amp; Pay Now
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Success Screen */
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#00e5be]/15 border border-[#00e5be] text-[#00e5be] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,229,190,0.3)]">
              <CheckCircle className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-white">
                Booking Confirmed!
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                Your e-tickets for {event.title} have been secured.
              </p>
            </div>

            {/* Mock QR Ticket Card */}
            <div className="p-4 rounded-2xl bg-[#131b26] border border-[#1e2a39] max-w-sm mx-auto flex items-center gap-4 text-left">
              <div className="w-20 h-20 bg-white rounded-xl p-1.5 flex items-center justify-center shrink-0">
                <QrCode className="w-full h-full text-[#0b0f15]" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-white line-clamp-1">{event.title}</p>
                <p className="text-[#00e5be] font-semibold">
                  {tiers[selectedTier].name} ({quantity}x)
                </p>
                <p className="text-slate-400 font-mono text-[10px]">
                  AVX-2026-{Math.floor(100000 + Math.random() * 900000)}
                </p>
                <p className="text-slate-400 text-[10px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#00e5be]" /> Verified Digital Pass
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-[#00e5be] text-[#091519] font-bold text-sm hover:bg-[#34f0cb] transition-all"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
