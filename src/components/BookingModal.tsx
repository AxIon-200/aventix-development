"use client";
import Link from "next/link";
import type { EventItem } from "./TrendingEvents";
import Dialog from "./auth/Dialog";
import { submitClass } from "./auth/FormField";
import { bookingHref } from "@/lib/event-booking";

/** Legacy entry retained without the former simulated payment/QR confirmation. */
export default function BookingModal({ event, onClose }: { event: EventItem | null; onClose: () => void }) {
  return <Dialog open={!!event} onClose={onClose} title="View ticket options">
    {event && <><p className="my-6 text-sm text-[#c5c6c7]">{event.title}</p><Link href={bookingHref(event.id)} className={submitClass}>Continue to event tickets</Link></>}
  </Dialog>;
}
