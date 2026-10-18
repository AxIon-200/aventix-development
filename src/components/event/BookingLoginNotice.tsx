"use client";
import { useState } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import { authHref } from "@/lib/auth/destination";

export default function BookingLoginNotice({ returnTo }: { returnTo: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <div className="flex flex-col gap-5 rounded-xl border border-[#1b4975] bg-[#0d2c56] p-6 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-semibold">Log in to select tickets</h2><p className="mt-1 text-sm text-[#c8d8e8]">Ticket options are shown for reference. Sign in is required before booking.</p><button type="button" className="mt-2 text-xs text-[#66fcf1] underline" onClick={() => setOpen(true)}>About account access</button></div>
      <Link href={authHref("/login", returnTo)} className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#66fcf1] px-12 py-3 text-sm font-bold text-[#0b0c10] hover:bg-[#8afff6]">LOG IN</Link>
    </div>
    <AuthModal isOpen={open} onClose={() => setOpen(false)} returnTo={returnTo} />
  </>;
}
