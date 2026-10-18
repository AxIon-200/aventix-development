import Link from "next/link";
import Image from "next/image";
import { formatDateTime } from "@/lib/format";
import { formatBookingAmount as formatPrice } from "@/lib/booking/format";
import type { BookingRecord } from "@/lib/booking/types";

export const primary =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-[#66fcf1] px-6 py-3 text-sm font-bold text-[#0b0c10] transition hover:bg-[#8afff6] disabled:cursor-not-allowed disabled:opacity-40";
export const secondary =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-[#2c3644] bg-[#151b23] px-5 py-3 text-sm font-semibold text-[#c5c6c7] hover:border-[#66fcf1] disabled:opacity-40";
export const panel =
  "rounded-xl border border-[#242c36] bg-[#151b23] p-5 sm:p-7";

export function BookingHeading({
  name,
  date,
  venue,
  backHref,
  backLabel = "Back to Event",
}: {
  name: string;
  date: string;
  venue: string;
  backHref: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-10">
      <Link
        href={backHref}
        className="inline-block rounded-full bg-[#1f2833] px-5 py-2 text-xs text-[#66fcf1]"
      >
        ← {backLabel}
      </Link>
      <h1 className="mt-5 font-display text-2xl font-bold uppercase sm:text-3xl">
        {name}
      </h1>
      <p className="mt-2 text-sm text-[#9aa4ae]">
        {formatDateTime(date)} · {venue}
      </p>
    </div>
  );
}
export function SeatPlan({ src }: { src?: string }) {
  const valid = src && (/^\/(?!\/)/.test(src) || /^https:\/\//.test(src));
  return (
    <aside className="min-w-0">
      <h2 className="mb-5 text-lg font-bold">SEAT PLAN</h2>
      {valid ? (
        <div className="relative aspect-[408/390] overflow-hidden rounded-2xl bg-[#151b23]">
          <Image
            src={src}
            alt="Event seat plan supplied by the event service"
            fill
            sizes="(max-width:1024px) 100vw, 408px"
            unoptimized={src.startsWith("http")}
            className="object-contain"
          />
        </div>
      ) : (
        <div className="flex min-h-60 items-center justify-center rounded-2xl border border-[#2c3644] bg-[#151b23] p-8 text-center text-sm leading-6 text-[#9aa4ae]">
          The event service has not supplied a seat-plan image. Only the
          numbered seats returned by the service can be selected.
        </div>
      )}
      <h3 className="mt-7 text-sm font-semibold text-[#66fcf1]">
        BOOKING REMINDERS
      </h3>
      <ol className="mt-4 list-inside list-decimal space-y-3 text-sm leading-6 text-[#9aa4ae]">
        <li>Choose categories and quantities.</li>
        <li>Select the required numbered seats.</li>
        <li>Review the server-created booking before payment.</li>
      </ol>
      <p className="mt-5 text-xs leading-5 text-[#9aa4ae]">
        A browser selection is not a reservation. The service must successfully
        hold every requested seat together.
      </p>
    </aside>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="my-5 rounded-lg border border-red-400/30 bg-red-400/5 p-4 text-sm leading-6 text-red-200"
    >
      {message}
    </p>
  );
}
export function Totals({ booking }: { booking: BookingRecord }) {
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between gap-4">
        <dt>Subtotal</dt>
        <dd>{formatPrice(booking.subtotal)}</dd>
      </div>
      {booking.fees.map((f, i) => (
        <div
          key={`${f.name}-${i}`}
          className="flex justify-between gap-4 text-[#c5c6c7]"
        >
          <dt>{f.name}</dt>
          <dd>{formatPrice(f.amount)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-[#2c3644] pt-4 text-lg font-bold">
        <dt>Total</dt>
        <dd className="text-[#66fcf1]">{formatPrice(booking.total)}</dd>
      </div>
    </dl>
  );
}
export function ItemList({ booking }: { booking: BookingRecord }) {
  return (
    <ul className="space-y-3">
      {booking.items.map((item) => (
        <li key={item.ticketCategoryId} className={panel}>
          <div className="flex flex-wrap justify-between gap-3">
            <h3 className="font-semibold">{item.name}</h3>
            <span className="text-sm text-[#c5c6c7]">
              {item.quantity} × {formatPrice(item.unitPrice)}
            </span>
          </div>
          <p className="mt-3 text-sm text-[#66fcf1]">
            Seats: {item.seats.map((s) => s.displayLabel).join(", ")}
          </p>
        </li>
      ))}
    </ul>
  );
}
