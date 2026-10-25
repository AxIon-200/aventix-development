"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmedETicket, { type ETicketData } from "./ConfirmedETicket";

export default function IssuedTicketView({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<{ status: string; bookingStatus: string; eventStatus: string; pass: ETicketData }>();
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/v1/checkout/tickets/${encodeURIComponent(ticketId)}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("This ticket could not be loaded. Sign in with the attendee account that booked it."); return response.json(); })
      .then(result => setTicket(result.data))
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [ticketId]);
  return <main className="min-h-screen bg-[#0B0F19] px-5 py-10 text-white">
    <Link href="/dashboard/tickets" className="text-teal-300 underline">My tickets</Link>
    {error && <p role="alert" className="mt-6">{error}</p>}
    {!ticket && !error && <p role="status">Loading ticket…</p>}
    {ticket && (ticket.status === "VALID" && ticket.bookingStatus === "CONFIRMED" && !["CANCELLED", "COMPLETED", "DRAFT"].includes(ticket.eventStatus)
      ? <ConfirmedETicket data={ticket.pass} />
      : <p role="status" className="mt-6">Ticket status: {ticket.status}. This ticket cannot grant admission.</p>)}
  </main>;
}
