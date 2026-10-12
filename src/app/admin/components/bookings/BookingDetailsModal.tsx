"use client";

import { useEffect, useState } from "react";
import { AdminBooking, AdminBookingDetails } from "@/app/admin/types/bookings";
import { getBookingById } from "@/app/admin/services/bookingService";
import { getPaymentTransitions } from "@/app/admin/lib/bookingRules";
import { formatDate } from "@/app/admin/lib/format";
import { formatPeso } from "@/app/admin/lib/currency";
import { Modal } from "@/app/admin/components/ui/Modal";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "@/app/admin/components/bookings/bookingStatus";

type Props = {
  bookingId: string | null; // null = closed
  onClose: () => void;
  onManagePayment: (booking: AdminBooking) => void;
};

export function BookingDetailsModal({ bookingId, onClose, onManagePayment }: Props) {
  const [booking, setBooking] = useState<AdminBookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    setBooking(null);
    setError(null);
    setIsLoading(true);
    getBookingById(bookingId)
      .then((b) => !cancelled && setBooking(b))
      .catch((e) => !cancelled && setError(e?.message ?? "Something went wrong"))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [bookingId, tick]);

  const customerFacts: [string, string][] = booking
    ? [
        ["Customer", booking.customerName],
        ["Email", booking.customerEmail],
        ["Phone", booking.customerPhone || "—"],
        ["Booked on", formatDate(booking.createdAt)],
      ]
    : [];

  const eventFacts: [string, string][] = booking
    ? [
        ["Event", booking.eventTitle],
        ["Event date", formatDate(booking.eventStartsAt)],
        ["Venue", booking.eventVenue],
        ["Tickets", booking.tickets.toLocaleString()],
      ]
    : [];

  const paymentFacts: [string, string][] = booking
    ? [
        ["Amount", formatPeso(booking.amount)],
        ["Method", booking.paymentMethod || "—"],
        ["Paid on", formatDate(booking.paidAt)],
        ...(booking.paymentStatus === "refunded"
          ? ([["Refunded on", formatDate(booking.refundedAt)]] as [string, string][])
          : []),
      ]
    : [];

  const canManagePayment = booking ? getPaymentTransitions(booking).length > 0 : false;

  return (
    <Modal
      isOpen={bookingId !== null}
      onClose={onClose}
      title="Booking details"
      size="lg"
      footer={
        <>
          {booking && canManagePayment && (
            <button
              onClick={() => onManagePayment(booking)}
              className="rounded-lg bg-teal-500/10 px-3.5 py-2 text-sm font-medium text-teal-300 hover:bg-teal-500/20"
            >
              Manage payment
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3.5 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            Close
          </button>
        </>
      }
    >
      {isLoading && (
        <div className="space-y-4" aria-busy="true">
          <div className="space-y-2">
            <div className="h-5 w-1/3 animate-pulse rounded bg-white/5" />
            <div className="h-5 w-1/4 animate-pulse rounded bg-white/5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
          <div className="h-20 animate-pulse rounded-lg bg-white/5" />
        </div>
      )}

      {!isLoading && error && (
        <ErrorState compact title="Couldn't load booking" message={error} onRetry={() => setTick((t) => t + 1)} />
      )}

      {!isLoading && booking && (
        <div className="space-y-5">
          <div>
            <p className="text-base font-semibold text-white">{booking.bookingCode}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <BookingStatusBadge status={booking.status} />
              <PaymentStatusBadge status={booking.paymentStatus} />
            </div>
          </div>

          {booking.paymentNote && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Payment note</p>
              <p className="mt-0.5 text-sm text-slate-300">{booking.paymentNote}</p>
            </div>
          )}

          {[
            ["Customer", customerFacts],
            ["Event", eventFacts],
            ["Payment", paymentFacts],
          ].map(([title, facts]) => (
            <div key={title as string}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {title as string}
              </h3>
              <dl className="grid grid-cols-2 gap-3">
                {(facts as [string, string][]).map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                    <dt className="text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
                    <dd className="mt-0.5 truncate text-sm text-slate-200">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tickets</h3>
            {booking.items.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 py-6 text-center text-sm text-slate-500">
                No ticket lines recorded for this booking.
              </p>
            ) : (
              <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
                {booking.items.map((item) => (
                  <li key={item.tier} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div>
                      <p className="text-sm text-slate-200">{item.tier}</p>
                      <p className="text-[11px] text-slate-500">
                        {item.quantity} × {formatPeso(item.unitPrice)}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-white">{formatPeso(item.quantity * item.unitPrice)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
