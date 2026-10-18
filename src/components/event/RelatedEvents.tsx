import Link from "next/link";
import { getEvents } from "@/lib/events-api";
import EventCard from "@/components/events/EventCard";

export default async function RelatedEvents({ eventId, eventType }: { eventId: string; eventType: string }) {
  let events;
  try { events = await getEvents(); } catch {
    return <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-16"><h2 className="font-display text-2xl font-bold">You may also like</h2><p className="mt-4 text-sm text-[#c5c6c7]">Related events are temporarily unavailable.</p><Link href="/events" className="mt-3 inline-block text-sm text-[#66fcf1]">Browse all events →</Link></section>;
  }
  const related = events.filter(e => e.id !== eventId && e.status === "PUBLISHED").sort((a, b) => Number(b.type === eventType) - Number(a.type === eventType)).slice(0, 3);
  if (!related.length) return null;
  return <section aria-labelledby="related-heading" className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-16 lg:py-20"><p className="text-xs font-semibold text-[#66fcf1]">RELATED EVENTS</p><h2 id="related-heading" className="mt-4 font-display text-[26px] font-bold">You may also like</h2><ul className="mt-6 grid gap-7 sm:grid-cols-2 lg:max-w-[976px] lg:grid-cols-3">{related.map(event => <EventCard key={event.id} event={event} />)}</ul></section>;
}
