import Link from "next/link";
import type { EventDetails, TicketCategory } from "@/types/event";
import { formatPrice, formatShortDate } from "@/lib/format";
import { bookingHref, categoryStateLabel, isCategoryBookable, type BookingState } from "@/lib/event-booking";

function availabilityNote(event: EventDetails, c: TicketCategory): string | null {
  if (event.status !== "PUBLISHED" || c.status === "DISABLED") return null;
  switch (c.availability) {
    case "AVAILABLE":
      if (c.remaining === undefined) return null;
      return c.remaining <= 50 ? `Only ${c.remaining} left` : `${c.remaining} available`;
    case "SOLD_OUT":
      return "No tickets remaining";
    case "NOT_YET_OPEN":
      return c.salesStartAt ? `On sale ${formatShortDate(c.salesStartAt)}` : "Sales have not opened";
    case "SALE_ENDED":
      return c.salesEndAt ? `Sale ended ${formatShortDate(c.salesEndAt)}` : "Sales have ended";
  }
}

export default function TicketCategories({ event, booking }: { event: EventDetails; booking: BookingState }) {
  return (
    <section id="tickets" aria-labelledby="tickets-heading" className="scroll-mt-36 bg-[#0b0c10]">
      <div className="mx-auto max-w-[1440px] px-4 pb-6 pt-12 sm:px-6 lg:px-16 lg:pt-[72px]">
        <p className="text-sm font-semibold tracking-wide text-[#66fcf1]">EVENT CALENDAR</p>
        <h2 id="tickets-heading" className="mt-2 font-display text-4xl font-bold text-white sm:text-[52px] sm:leading-[62px]">
          TICKETS
        </h2>
        <p className="mt-2 text-[17px] text-[#c5c6c7]">Choose your ticket type for {event.name}</p>

        {!booking.canBook && booking.message && (
          <p role="status" className="mt-6 rounded-xl border border-[#242c36] bg-[#151b23] px-5 py-4 text-sm text-[#c5c6c7]">
            {booking.message}
          </p>
        )}

        {event.categories.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-[#242c36] bg-[#151b23] px-6 py-8 text-[#c5c6c7]">
            Ticket categories have not been announced for this event yet.
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-6">
            {event.categories.map((c) => {
              const bookable = isCategoryBookable(event, c);
              const note = availabilityNote(event, c);
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-5 rounded-2xl border border-[#242c36] bg-[#151b23] px-6 py-6 sm:px-10 md:flex-row md:items-center md:justify-between md:py-8"
                >
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-white sm:text-[22px]">{c.name}</h3>
                    <p className="mt-2 text-[15px] font-medium text-[#8fa9a0]">
                      <time dateTime={event.startsAt}>{formatShortDate(event.startsAt)}</time>
                    </p>
                    {c.description && <p className="mt-2 max-w-xl text-sm text-[#c5c6c7]">{c.description}</p>}
                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="font-bold text-white">{formatPrice(c.price)}</span>
                      {note && <span className={bookable ? "text-[#66fcf1]" : "text-[#8a8b8c]"}>{note}</span>}
                    </p>
                  </div>

                  {bookable ? (
                    <Link
                      href={bookingHref(event.id, c.id)}
                      aria-label={`Buy tickets: ${c.name}`}
                      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#66fcf1] px-8 py-3.5 text-[15px] font-bold text-[#0b0c0b] transition hover:bg-[#8afff6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      Buy Tickets
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="inline-flex shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-[#2c3644] bg-[#1f2833] px-8 py-3.5 text-[15px] font-bold text-[#8a8b8c]"
                    >
                      {categoryStateLabel(event, c)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
