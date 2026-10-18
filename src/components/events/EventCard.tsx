import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { EventDetails } from "@/types/event";
import { formatPrice } from "@/lib/format";
import { getBookingState } from "@/lib/event-booking";
import { dateBadge, minPrice } from "@/lib/event-filters";

export default function EventCard({ event }: { event: EventDetails }) {
  const badge = dateBadge(event.startsAt);
  const booking = getBookingState(event);
  const price = minPrice(event);
  const img = event.posterUrl ?? event.bannerUrl;

  return (
    <li>
      <Link
        href={`/events/${encodeURIComponent(event.id)}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#2c3644] bg-[#1f2833] transition hover:border-[#66fcf1]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#66fcf1]"
      >
        <div className="relative aspect-[305/200] w-full overflow-hidden bg-[#151b23]">
          {img && (
            <Image
              src={img}
              alt=""
              fill
              unoptimized={img.startsWith("http")}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <div className="absolute left-3 top-3 flex flex-col items-center gap-1 rounded-lg bg-[#0b0c10]/90 px-3 py-1.5 text-center font-bold">
            <span className="text-xs leading-3 tracking-[0.67px] text-[#66fcf1]">{badge.month}</span>
            <span className="text-sm leading-[14px] tracking-[0.36px] text-white">{badge.day}</span>
            <span className="text-[9px] leading-[9px] text-white">{badge.year}</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-[3.5px] p-5">
          <h3 className="line-clamp-2 min-h-14 font-display text-lg font-bold leading-7 text-white">{event.name}</h3>
          <p className="font-display text-[13px] font-medium leading-[18px] text-[#45a29e]">{event.performers.join(", ")}</p>
          <p className="flex items-center gap-2 text-sm text-[#c5c6c7]">
            <MapPin aria-hidden className="h-3 w-3 shrink-0 text-[#45a29e]" />
            <span className="truncate">
              {event.venue.name}
              {event.venue.city ? `, ${event.venue.city}` : ""}
            </span>
          </p>
          <div className="mt-auto flex items-center justify-between pt-3">
            <div>
              {price !== null && (
                <>
                  <span className="block text-xs text-[#c5c6c7]">Starts from</span>
                  <span className="block text-base font-bold tracking-[-0.3px] text-[#66fcf1]">{formatPrice(price)}</span>
                </>
              )}
            </div>
            {booking.canBook ? (
              <span className="rounded-full bg-[#66fcf1] px-4 py-2 text-xs font-semibold text-[#0b0c10] transition group-hover:bg-[#8afff6]">
                Book Now
              </span>
            ) : (
              <span className="rounded-full border border-[#2c3644] bg-[#151b23] px-4 py-2 text-xs font-semibold text-[#8a8b8c]">
                {booking.label}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
