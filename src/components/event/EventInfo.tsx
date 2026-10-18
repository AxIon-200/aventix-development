import Image from "next/image";
import { CalendarDays, Clock, MapPin, Building2, Ticket, Info } from "lucide-react";
import type { EventDetails } from "@/types/event";
import { formatDateTime, formatEventDate, formatTime } from "@/lib/format";
import type { BookingState } from "@/lib/event-booking";

function Row({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-[#242c36] bg-[#151b23] p-5">
      <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[#66fcf1]" />
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-[#8a8b8c]">{label}</dt>
        <dd className="mt-1 text-[15px] text-white">{children}</dd>
      </div>
    </div>
  );
}

export default function EventInfo({ event, booking }: { event: EventDetails; booking: BookingState }) {
  const { venue } = event;
  const hasMap = venue.latitude !== undefined && venue.longitude !== undefined;
  const pad = 0.006;
  const mapSrc = hasMap
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${venue.longitude! - pad},${venue.latitude! - pad},${
        venue.longitude! + pad
      },${venue.latitude! + pad}&layer=mapnik&marker=${venue.latitude},${venue.longitude}`
    : null;

  return (
    <section id="info" aria-labelledby="info-heading" className="scroll-mt-36 bg-[#0b0c10]">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-16 lg:py-16">
        <p className="text-[13px] font-bold tracking-wide text-[#66fcf1]">EVENT INFO</p>
        <h2 id="info-heading" className="mt-2 font-display text-[26px] font-bold text-white">
          About this event
        </h2>
        <p className="mt-4 max-w-3xl whitespace-pre-line text-[15px] leading-7 text-[#c5c6c7]">{event.description}</p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Row icon={CalendarDays} label="Date">
            {formatEventDate(event.startsAt)}
          </Row>
          <Row icon={Clock} label="Time">
            {formatTime(event.startsAt)}
            {event.endsAt ? ` – ${formatTime(event.endsAt)}` : ""}
          </Row>
          <Row icon={MapPin} label="Venue">
            <span className="font-semibold">{venue.name}</span>
            <br />
            <span className="text-[#c5c6c7]">{venue.address}</span>
          </Row>
          <Row icon={Building2} label="Organizer">
            <span className="font-semibold">{event.organizer.name}</span>
            {event.organizer.description && (
              <>
                <br />
                <span className="text-sm text-[#c5c6c7]">{event.organizer.description}</span>
              </>
            )}
          </Row>
          <Row icon={Ticket} label="Ticket selling period">
            {event.salesStartAt || event.salesEndAt ? (
              <>
                {event.salesStartAt ? formatDateTime(event.salesStartAt) : "Now"}
                {" – "}
                {event.salesEndAt ? formatDateTime(event.salesEndAt) : "until the event"}
              </>
            ) : (
              "To be announced"
            )}
          </Row>
          <Row icon={Info} label="Event status">
            {booking.label}
          </Row>
        </dl>

        {mapSrc && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-[#242c36]">
            <iframe
              title={`Map of ${venue.name}`}
              src={mapSrc}
              loading="lazy"
              className="h-72 w-full border-0 bg-[#151b23]"
            />
          </div>
        )}

        {event.gallery && event.gallery.length > 0 && (
          <div className="mt-10">
            <h3 className="font-display text-xl font-bold text-white">Gallery</h3>
            <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {event.gallery.map((src, i) => (
                <li key={`${src}-${i}`} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#1f2833]">
                  <Image
                    src={src}
                    alt={`${event.name} promotional image ${i + 1}`}
                    fill
                    unoptimized={src.startsWith("http")}
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
