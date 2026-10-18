import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import DemoNotice from "@/components/events/DemoNotice";
import EventsBrowser from "@/components/events/EventsBrowser";
import { getEvents } from "@/lib/events-api";

export const metadata: Metadata = {
  title: "All Events | Aventix",
  description: "Discover concerts and live experiences happening across the Philippines.",
};

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; location?: string; date?: string; category?: string }> }) {
  const { q, location, date, category } = await searchParams;
  const events = await getEvents(); // failures bubble to error.tsx
  const initialQuery = Array.isArray(q) ? q[0] : q ?? "";

  return (
    <PageShell searchEvents={events}>
      <section aria-labelledby="events-title" className="bg-[#0b0c10]">
        <div className="mx-auto max-w-[1440px] px-4 pb-6 pt-12 sm:px-6 lg:px-16 lg:pt-[44px]">
          <p className="text-sm font-semibold text-[#66fcf1]">EVENT CALENDAR</p>
          <h1 id="events-title" className="mt-2 font-display text-4xl font-bold text-white sm:text-[52px] sm:leading-[62px]">
            All Events
          </h1>
          <p className="mt-2 text-[17px] text-[#c5c6c7]">Discover concerts and live experiences happening across the Philippines.</p>
        </div>
      </section>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16"><DemoNotice /></div>
      <EventsBrowser key={JSON.stringify([initialQuery, location, date, category])} events={events} initialQuery={initialQuery} initialLocation={typeof location === "string" ? location : undefined} initialDate={typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined} initialCategory={typeof category === "string" ? category : undefined} />
    </PageShell>
  );
}
