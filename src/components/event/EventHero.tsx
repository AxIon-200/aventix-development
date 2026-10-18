import Image from "next/image";
import Link from "next/link";
import { MapPin, CalendarDays } from "lucide-react";
import type { EventDetails } from "@/types/event";
import { formatEventDate } from "@/lib/format";
import { bookingHref, type BookingState } from "@/lib/event-booking";

export default function EventHero({ event, booking }: { event: EventDetails; booking: BookingState }) {
  const backdrop = event.bannerUrl ?? event.posterUrl;
  const artwork = event.posterUrl ?? event.bannerUrl;

  return (
    <section aria-labelledby="event-title" className="relative overflow-hidden bg-[#0d3a29]">
      {backdrop && (
        <Image
          src={backdrop}
          alt=""
          fill
          priority
          unoptimized={backdrop.startsWith("http")}
          sizes="100vw"
          className="scale-110 object-cover opacity-30 blur-[9px]"
        />
      )}
      <div className="absolute inset-0 bg-[#0b0c0b]/70" aria-hidden />

      <div className="relative mx-auto grid max-w-[1440px] items-center gap-8 px-4 py-10 sm:px-6 md:py-12 lg:grid-cols-[1fr_406px] lg:gap-16 lg:px-28 lg:py-[59px]">
        <div className="min-w-0">
          <span
            className={`mb-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
              booking.canBook
                ? "border-[#66fcf1]/40 bg-[#66fcf1]/10 text-[#66fcf1]"
                : "border-white/20 bg-white/10 text-white"
            }`}
          >
            {event.type} · {booking.label}
          </span>

          <h1 id="event-title" className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:max-w-[650px] lg:text-[40px]">
            {event.name}
          </h1>

          {event.performers.length > 0 && (
            <p className="mt-3 text-sm text-[#d6dfdb]">{event.performers.join(", ")}</p>
          )}

          <p className="mt-5 flex items-center gap-2 font-display text-[17px] font-bold text-white">
            <CalendarDays aria-hidden className="h-4 w-4 text-[#66fcf1]" />
            <time dateTime={event.startsAt}>{formatEventDate(event.startsAt)}</time>
          </p>
          <p className="mt-3 flex items-center gap-2 font-display text-sm text-[#d6dfdb]">
            <MapPin aria-hidden className="h-4 w-4 shrink-0" />
            <span>
              {event.venue.name}
              {event.venue.city ? `, ${event.venue.city}` : ""}
            </span>
          </p>

          <div className="mt-7">
            {booking.canBook ? (
              <Link
                href={bookingHref(event.id)}
                className="inline-flex items-center justify-center rounded-full bg-[#66fcf1] px-8 py-3.5 text-[15px] font-bold text-[#0b0c0b] shadow-glow transition hover:bg-[#8afff6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Book Tickets
              </Link>
            ) : (
              <div role="status" className="max-w-md">
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-full bg-white/10 px-8 py-3.5 text-[15px] font-bold text-white/60"
                >
                  Book Tickets
                </button>
                {booking.message && <p className="mt-3 text-sm text-[#d6dfdb]">{booking.message}</p>}
              </div>
            )}
          </div>
        </div>

        {artwork && (
          <div className="relative mx-auto aspect-[410/268] w-full max-w-[406px] overflow-hidden rounded-lg bg-[#1f2833] shadow-2xl lg:mx-0">
            <Image
              src={artwork}
              alt={`${event.name} poster`}
              fill
              priority
              unoptimized={artwork.startsWith("http")}
              sizes="(max-width: 1024px) 90vw, 406px"
              className="object-cover"
            />
          </div>
        )}
      </div>
    </section>
  );
}
