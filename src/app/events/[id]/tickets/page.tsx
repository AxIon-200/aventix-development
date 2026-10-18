import TicketSelection from "@/components/booking/TicketSelection";
import type { EventDetails } from "@/types/event";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import DemoNotice from "@/components/events/DemoNotice";
import BookingLoginNotice from "@/components/event/BookingLoginNotice";
import { getEventById } from "@/lib/events-api";
import { bookingHref, categoryStateLabel, getBookingState, isCategoryBookable } from "@/lib/event-booking";
import { formatDateTime } from "@/lib/format";
import { formatBookingAmount as formatPrice } from "@/lib/booking/format";
import styles from "@/components/booking/TicketSelection.module.css";
import { authHref } from "@/lib/auth/destination";

export const metadata: Metadata = { title: "Ticket options | Aventix" };

export default async function TicketsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ category?: string }> }) {
  const { id } = await params;
  const { category } = await searchParams;
  const event = await getEventById(id);
  if (!event) notFound();
  return <TicketSelection eventId={event.id} initialCategory={typeof category === "string" ? category : undefined} fallback={<PublicTicketEntry event={event} category={category} />} />;
}

function PublicTicketEntry({ event, category }: { event: EventDetails; category?: string }) {
  const selected = typeof category === "string" ? event.categories.find(c => c.id === category) : undefined;
  const returnTo = bookingHref(event.id, selected?.id);
  const booking = getBookingState(event);
  return <PageShell><div className={styles.page}>
    <Link href={`/events/${encodeURIComponent(event.id)}`} className="inline-block rounded-full bg-[#1f2833] px-5 py-2 text-xs text-[#66fcf1]">← Back to Event</Link>
    <div className="mb-7 mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><h1 className="font-display text-2xl font-bold uppercase sm:text-3xl">{event.name}</h1><p className="mt-2 text-sm text-[#9aa4ae]">{formatDateTime(event.startsAt)} · {event.venue.name}{event.venue.city ? `, ${event.venue.city}` : ""}</p></div><span className="shrink-0 self-start rounded-full bg-[#66fcf1] px-6 py-2 text-[11px] font-semibold text-[#0b0c10]">LOGIN REQUIRED TO BOOK</span></div>
    <DemoNotice />
    {booking.message && <p role="status" className="mb-6 rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200">{booking.message} Signing in does not override ticket availability.</p>}
    {category && !selected && <p role="status" className="mb-4 text-sm text-amber-200">That ticket category is no longer available. Review the current categories below.</p>}
    <BookingLoginNotice returnTo={returnTo} />
    <div className={styles.columns}>
      <aside><h2 className={styles.sectionTitle}>SEAT PLAN</h2><div className="flex aspect-[408/350] flex-col items-center justify-center rounded-2xl border border-[#26303b] bg-[#151b23] p-8 text-center"><p className="font-semibold text-[#66fcf1]">Seat plan preview unavailable</p><p className="mt-3 text-sm leading-6 text-[#9aa4ae]">The official seat-plan image has not been supplied for this event. Ticket controls remain locked until login.</p></div><h3 className="mt-10 text-sm font-bold">NOTICE TO ALL ONLINE CUSTOMERS</h3><p className="mt-3 text-sm leading-6 text-[#9aa4ae]">Log in before selecting a ticket. Ticket quantities, numbered seats, and checkout remain locked while you are signed out.</p><ol className="mt-5 list-inside list-decimal space-y-3 text-sm text-[#c5c6c7]"><li>Log in to your Aventix account.</li><li>Return to the selected event.</li><li>Follow the agreed ticket and numbered-seat flow when it becomes available.</li></ol></aside>
      <section className="min-w-0" aria-labelledby="ticket-options"><h2 id="ticket-options" className={styles.sectionTitle}>TICKETS</h2>
        <div className={styles.tableHead} aria-hidden="true"><span>Location</span><span>Section</span><span>Price</span><span>Quantity</span><span>Action</span></div>
        {event.categories.length === 0 ? <p className="py-8 text-[#9aa4ae]">No ticket categories have been announced.</p> : <ul className={styles.rows}>{event.categories.map(c => <li key={c.id} className={`${styles.row} ${selected?.id === c.id ? styles.highlighted : ""}`}>
          <div className={styles.location}><h3>{c.name}</h3>{c.description && <p>{c.description}</p>}</div>
          <div className={styles.lockedSection}>{isCategoryBookable(event, c) ? "Login to select" : categoryStateLabel(event, c)}</div>
          <p className={styles.price}>{formatPrice(c.price)}</p>
          <button type="button" disabled aria-label={`Quantity locked for ${c.name}`} className={styles.quantity}>—</button>
          <button type="button" disabled className={styles.locked}>LOCKED</button>
        </li>)}</ul>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#1b4975] bg-[#10304a] p-5"><div><h3 className="font-semibold">Ready to choose your tickets?</h3><p className="mt-1 text-xs text-[#9aa4ae]">Your event and category stay in the login link.</p></div><Link href={authHref("/login", returnTo)} className="rounded-full bg-[#66fcf1] px-8 py-3 text-xs font-bold text-[#0b0c10]">LOG IN</Link></div>
      </section>
    </div>
  </div></PageShell>;
}
