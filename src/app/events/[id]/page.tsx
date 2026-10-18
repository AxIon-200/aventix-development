import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RelatedEvents from "@/components/event/RelatedEvents";
import DemoNotice from "@/components/events/DemoNotice";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventHero from "@/components/event/EventHero";
import EventSectionNav from "@/components/event/EventSectionNav";
import TicketCategories from "@/components/event/TicketCategories";
import EventInfo from "@/components/event/EventInfo";
import Lineup from "@/components/event/Lineup";
import Playlist from "@/components/event/Playlist";
import { getEventById } from "@/lib/events-api";
import { getBookingState } from "@/lib/event-booking";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const event = await getEventById(id);
    if (!event) return { title: "Event not found | Aventix" };
    return { title: `${event.name} | Aventix`, description: event.description.slice(0, 160) };
  } catch {
    return { title: "Event | Aventix" };
  }
}

export default async function EventDetailsPage({ params }: Props) {
  const { id } = await params;
  const event = await getEventById(id); // request failures bubble to error.tsx
  if (!event) notFound();

  const booking = getBookingState(event);

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0c10] font-sans text-white">
      <Navbar searchEvents={[event]} />
      <main id="main-content" className="flex-1">
        <div className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-16"><DemoNotice /></div>
        <EventHero event={event} booking={booking} />
        <EventSectionNav hasPlaylist={!!event.playlist} hasLineup={event.performers.length > 1} />
        <TicketCategories event={event} booking={booking} />
        <EventInfo event={event} booking={booking} />
        {event.playlist && <Playlist playlist={event.playlist} />}
        {event.performers.length > 1 && <Lineup performers={event.performers} />}
        <RelatedEvents eventId={event.id} eventType={event.type} />
      </main>
      <Footer />
    </div>
  );
}
