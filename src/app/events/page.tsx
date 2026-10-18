import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import EventsBrowser from "@/components/events/EventsBrowser";
import { getEvents } from "@/lib/events-api";

export const metadata: Metadata = {
  title: "All Events | Aventix",
  description: "Discover concerts and live experiences happening across the Philippines.",
};

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const events = await getEvents(); // failures bubble to error.tsx
  const initialQuery = Array.isArray(q) ? q[0] : q ?? "";

  return (
    <PageShell>
      <section aria-labelledby="events-title" className="bg-[#0b0c10]">
        <div className="mx-auto max-w-[1440px] px-4 pb-6 pt-12 sm:px-6 lg:px-16 lg:pt-[44px]">
          <p className="text-sm font-semibold text-[#66fcf1]">EVENT CALENDAR</p>
          <h1 id="events-title" className="mt-2 font-display text-4xl font-bold text-white sm:text-[52px] sm:leading-[62px]">
            All Events
          </h1>
          <p className="mt-2 text-[17px] text-[#c5c6c7]">Discover concerts and live experiences happening across the Philippines.</p>
        </div>
      </section>
      <EventsBrowser events={events} initialQuery={initialQuery} />
    </PageShell>
  );
}
