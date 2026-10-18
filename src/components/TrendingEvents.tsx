import Link from "next/link";
import { getEvents } from "@/lib/events-api";
import EventCard from "@/components/events/EventCard";
import DemoNotice from "@/components/events/DemoNotice";

/** Retained for the legacy booking-entry component's public prop shape. */
export interface EventItem { id: string; month: string; day: string; year: string; title: string; artist: string; venue: string; price: string; imageUrl: string }

export default async function TrendingEvents() {
  let events;
  try { events = await getEvents(); } catch { return <section className="mx-auto max-w-[1440px] px-6 py-16 lg:px-16"><h2 className="font-display text-3xl font-bold">Trending Events</h2><p role="status" className="mt-4 text-[#c5c6c7]">We couldn’t load events right now.</p><Link href="/events" className="mt-4 inline-block text-[#66fcf1]">Try the events page →</Link></section>; }
  return <section id="trending-events" className="mx-auto max-w-[1440px] scroll-mt-24 px-4 py-16 sm:px-6 lg:px-16 lg:py-24">
    <div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold tracking-widest text-[#66fcf1]">DON’T MISS OUT</p><h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Trending Events</h2></div><Link href="/events" className="shrink-0 text-sm text-[#66fcf1]">View All →</Link></div>
    <DemoNotice />
    {events.length ? <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{events.slice(0, 4).map(event => <EventCard key={event.id} event={event} />)}</ul> : <p className="py-8 text-[#c5c6c7]">No events have been published yet. Check back soon.</p>}
  </section>;
}
