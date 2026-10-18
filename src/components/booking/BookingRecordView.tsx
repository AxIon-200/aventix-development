"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import Dialog from "@/components/auth/Dialog";
import { useAccountSession } from "@/components/auth/useAccountSession";
import { publicAuthClient, type PublicAuthClient } from "@/lib/auth/client";
import { authHref } from "@/lib/auth/destination";
import {
  publicBookingClient,
  BookingClientError,
  bookingErrorMessage,
  type PublicBookingClient,
} from "@/lib/booking/client";
import {
  canCancel,
  canPay,
  isConfirmed,
  reconcileBooking,
  safeLocalHref,
  secondsRemaining,
  trustedPaymentUrl,
} from "@/lib/booking/rules";
import { requireBooking } from "@/lib/booking/validate";
import { formatBookingAmount as formatPrice } from "@/lib/booking/format";
import type {
  BookingRecord,
  PaymentInstructions,
  PaymentMethod,
} from "@/lib/booking/types";
import {
  BookingHeading,
  ErrorNotice,
  ItemList,
  panel,
  primary,
  secondary,
  SeatPlan,
  Totals,
} from "./BookingPrimitives";

type Mode = "summary" | "payment" | "confirmation";

function useReservationClock(booking?: BookingRecord) {
  const [clock, setClock] = useState({ stamp: "", elapsed: 0 });
  const stamp = booking ? `${booking.id}/${booking.serverNow}` : "";
  useEffect(() => {
    if (!stamp) return;
    const receivedAt = performance.now();
    const timer = window.setInterval(
      () => setClock({ stamp, elapsed: performance.now() - receivedAt }),
      500,
    );
    return () => window.clearInterval(timer);
  }, [stamp]);
  return booking
    ? secondsRemaining(booking, clock.stamp === stamp ? clock.elapsed : 0)
    : 0;
}

export default function BookingRecordView({
  bookingId,
  mode,
  client = publicBookingClient,
  auth = publicAuthClient,
}: {
  bookingId: string;
  mode: Mode;
  client?: PublicBookingClient;
  auth?: PublicAuthClient;
}) {
  const access = useAccountSession(auth);
  const router = useRouter();
  const [booking, setBooking] = useState<BookingRecord>();
  const previous = useRef<BookingRecord>(undefined);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const loadLock = useRef(false);
  const mounted = useRef(true);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodId, setMethodId] = useState("");
  const [attemptStarted, setAttemptStarted] = useState(false);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [instructions, setInstructions] = useState<PaymentInstructions>();
  const [cancelIntent, setCancelIntent] = useState<"cancel" | "edit" | null>(
    null,
  );
  const remaining = useReservationClock(booking);
  const currentStatus = booking?.status;
  const currentSnapshotTime = booking?.serverNow;

  const refresh = useCallback(async () => {
    if (loadLock.current) return;
    loadLock.current = true;
    try {
      if (!client.getBooking) throw new BookingClientError("UNAVAILABLE");
      const next = reconcileBooking(
        previous.current,
        requireBooking(await client.getBooking(bookingId), bookingId),
      );
      if (mounted.current) {
        previous.current = next;
        setBooking(next);
        setStale(false);
        setError("");
      }
      return next;
    } catch (e) {
      if (mounted.current) {
        setError(bookingErrorMessage(e));
        setStale(true);
        if (
          e instanceof BookingClientError &&
          ["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND"].includes(e.code)
        ) {
          previous.current = undefined;
          setBooking(undefined);
        }
      }
    } finally {
      loadLock.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [bookingId, client]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (access.session) void refresh();
  }, [access.session, refresh]);
  useEffect(() => {
    if (
      mode !== "payment" ||
      !access.session ||
      !booking ||
      booking.status !== "PENDING_PAYMENT"
    )
      return;
    const timer = window.setInterval(() => {
      if (!busyRef.current) void refresh();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [mode, access.session, booking, refresh]);
  useEffect(() => {
    if (
      mode !== "payment" ||
      !client.getPaymentMethods ||
      !currentSnapshotTime ||
      currentStatus !== "PENDING_PAYMENT"
    )
      return;
    let active = true;
    async function load() {
      try {
        const result = await client.getPaymentMethods!(bookingId);
        if (
          !Array.isArray(result) ||
          !result.every(
            (m) =>
              m &&
              typeof m.id === "string" &&
              typeof m.label === "string" &&
              (m.description === undefined ||
                typeof m.description === "string"),
          ) ||
          new Set(result.map((m) => m.id)).size !== result.length
        )
          throw new BookingClientError("CONTRACT_MISMATCH");
        if (active) {
          setMethods(result);
          setMethodsLoading(false);
        }
      } catch (e) {
        if (active) {
          setMethods([]);
          setMethodsLoading(false);
          setError(bookingErrorMessage(e));
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [mode, bookingId, client, currentStatus, currentSnapshotTime]);
  useEffect(() => {
    if (mode === "payment" && booking && isConfirmed(booking))
      router.replace(`/bookings/${encodeURIComponent(bookingId)}/confirmation`);
  }, [mode, booking, bookingId, router]);

  async function startPayment() {
    if (
      busyRef.current ||
      !booking ||
      stale ||
      (attemptStarted && booking.paymentStatus !== "FAILED") ||
      !canPay(booking, remaining) ||
      !methods.some((m) => m.id === methodId)
    )
      return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setInstructions(undefined);
    try {
      if (!client.startPayment) throw new BookingClientError("UNAVAILABLE");
      const result = await client.startPayment(
        bookingId,
        methodId,
        crypto.randomUUID(),
      );
      if (
        !result ||
        [result.message, result.redirectUrl, result.qrImageUrl].some(
          (value) => value !== undefined && typeof value !== "string",
        )
      )
        throw new BookingClientError("CONTRACT_MISMATCH");
      setAttemptStarted(true);
      // Never trust a provider redirect or browser success query as payment proof.
      if (
        result.redirectUrl &&
        !trustedPaymentUrl(result.redirectUrl, client.trustedPaymentOrigins)
      )
        throw new BookingClientError("CONTRACT_MISMATCH");
      if (
        result.qrImageUrl &&
        !trustedPaymentUrl(result.qrImageUrl, client.trustedPaymentOrigins)
      )
        throw new BookingClientError("CONTRACT_MISMATCH");
      setInstructions(result);
      await refresh();
    } catch (e) {
      setError(bookingErrorMessage(e));
      setStale(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function cancelReservation() {
    if (busyRef.current || !booking || stale || !canCancel(booking, remaining))
      return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      if (!client.cancelUnpaidBooking)
        throw new BookingClientError("UNAVAILABLE");
      const next = reconcileBooking(
        booking,
        requireBooking(
          await client.cancelUnpaidBooking(bookingId, crypto.randomUUID()),
          bookingId,
        ),
      );
      previous.current = next;
      setBooking(next);
      setCancelIntent(null);
      if (next.status !== "CANCELLED" && next.status !== "EXPIRED")
        throw new BookingClientError("BOOKING_NOT_CANCELLABLE");
      if (cancelIntent === "edit")
        router.push(`/events/${encodeURIComponent(next.event.id)}/tickets`);
    } catch (e) {
      setError(bookingErrorMessage(e));
      setStale(true);
      setCancelIntent(null);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const returnTo = `/bookings/${encodeURIComponent(bookingId)}/${mode}`;
  const title =
    mode === "summary"
      ? "Booking summary"
      : mode === "payment"
        ? "Payment"
        : "Booking status";
  if (access.loading)
    return (
      <PageShell>
        <p role="status" className="p-10">
          Checking your account…
        </p>
      </PageShell>
    );
  if (!access.session)
    return (
      <PageShell>
        <section className="mx-auto max-w-2xl px-6 py-20">
          <h1 className="font-display text-3xl font-bold">
            Log in to view your booking
          </h1>
          <p className="mt-5 text-[#c5c6c7]">
            {access.unavailable
              ? "The shared account service is not connected. No booking or payment result can be verified."
              : "Only the authorized booking owner may view these details."}
          </p>
          <Link
            href={authHref("/login", returnTo)}
            className={`${primary} mt-6`}
          >
            Log in
          </Link>
        </section>
      </PageShell>
    );
  if (!booking)
    return (
      <PageShell>
        <section className="mx-auto max-w-2xl px-6 py-20">
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          {loading ? (
            <p role="status" className="mt-6">
              Retrieving your current booking…
            </p>
          ) : (
            <>
              <ErrorNotice message={error} />
              <button
                type="button"
                onClick={() => void refresh()}
                className={secondary}
              >
                Try again
              </button>
            </>
          )}
          <Link href="/events" className="ml-4 text-sm text-[#66fcf1]">
            Back to Events
          </Link>
        </section>
      </PageShell>
    );

  const confirmed = isConfirmed(booking);
  const eventHref = `/events/${encodeURIComponent(booking.event.id)}`;
  const paymentEnabled = !stale && canPay(booking, remaining);
  const cancellationEnabled = !stale && canCancel(booking, remaining);
  const ticketsHref = confirmed
    ? safeLocalHref(booking.myTicketsHref)
    : undefined;
  const instructionsActive =
    !stale &&
    booking.event.status === "PUBLISHED" &&
    booking.status === "PENDING_PAYMENT" &&
    booking.paymentStatus !== "FAILED" &&
    booking.paymentStatus !== "PAID" &&
    booking.paymentStatus !== "REFUNDED" &&
    remaining > 0;
  const paymentRedirect = instructionsActive
    ? trustedPaymentUrl(instructions?.redirectUrl, client.trustedPaymentOrigins)
    : undefined;
  const paymentQr = instructionsActive
    ? trustedPaymentUrl(instructions?.qrImageUrl, client.trustedPaymentOrigins)
    : undefined;

  return (
    <PageShell>
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-16">
        <BookingHeading
          name={
            mode === "confirmation" && confirmed ? "Booking confirmed" : title
          }
          date={booking.event.startsAt}
          venue={booking.event.venue.name}
          backHref={eventHref}
        />
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#2c3644] bg-[#151b23] p-5">
          <div>
            <p className="text-sm font-semibold">{booking.reference}</p>
            <p className="mt-1 text-xs text-[#9aa4ae]">
              Booking: {booking.status} · Payment: {booking.paymentStatus}
              {booking.paymentMethod ? ` · ${booking.paymentMethod}` : ""}
            </p>
          </div>
          {booking.status === "PENDING_PAYMENT" && (
            <p
              role="timer"
              aria-live="off"
              className="text-sm font-semibold text-[#66fcf1]"
            >
              {remaining > 0
                ? `Reservation: ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                : "Reservation deadline reached — refresh status"}
            </p>
          )}
        </div>
        {error && <ErrorNotice message={error} />}
        {stale && (
          <p role="status" className="mb-5 text-sm text-amber-200">
            These details could not be refreshed. Booking and payment actions
            are disabled until a successful refresh.
          </p>
        )}
        <h2 className="mb-7 font-display text-2xl font-bold uppercase">
          {booking.event.name}
        </h2>

        {mode === "summary" && (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,408px)_minmax(0,1fr)]">
            <SeatPlan src={booking.seatPlanUrl} />
            <section className="min-w-0">
              <h3 className="mb-5 border-b border-[#26303b] pb-4 font-bold">
                SELECTED TICKETS
              </h3>
              <ItemList booking={booking} />
              <h3 className="mb-5 mt-8 border-b border-[#26303b] pb-4 font-bold">
                ORDER SUMMARY
              </h3>
              <div className={panel}>
                <Totals booking={booking} />
                <p className="mt-4 text-xs leading-5 text-[#9aa4ae]">
                  Amounts and configured fees are supplied by the booking
                  service. Your selected numbered seats are reserved only while
                  this booking remains valid.
                </p>
              </div>
              <Customer booking={booking} />
              <div className="mt-7 flex flex-wrap gap-3">
                {paymentEnabled && (
                  <Link
                    href={`/bookings/${encodeURIComponent(bookingId)}/payment`}
                    className={primary}
                  >
                    Proceed to Payment
                  </Link>
                )}
                {cancellationEnabled && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setCancelIntent("edit")}
                    className={secondary}
                  >
                    Cancel reservation to edit selection
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void refresh()}
                  className={secondary}
                >
                  Refresh booking
                </button>
              </div>
              <p className="mt-4 text-xs leading-5 text-[#9aa4ae]">
                Back navigation does not cancel a hold. Changing a held
                selection requires explicit cancellation through the service
                first.
              </p>
            </section>
          </div>
        )}

        {mode === "payment" && (
          <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">
              <div className="rounded-t-xl bg-[#0755c9] p-5 text-center text-xl font-bold">
                {methods.find((m) => m.id === methodId)?.label ??
                  "Secure payment"}
              </div>
              <div className="rounded-b-xl bg-[#f4f5f8] p-6 text-[#17212b] sm:p-10">
                <h3 className="text-xl font-semibold">
                  Complete payment using the supported service
                </h3>
                <p className="mt-3 text-sm leading-6">
                  The amount due is {formatPrice(booking.total)}. Only a
                  confirmed result from the booking service can complete this
                  booking.
                </p>
                {paymentEnabled && (
                  <fieldset
                    disabled={
                      busy ||
                      (attemptStarted && booking.paymentStatus !== "FAILED")
                    }
                    className="mt-6 space-y-3"
                  >
                    <legend className="mb-3 text-sm font-semibold">
                      Choose payment method
                    </legend>
                    {methods.map((method) => (
                      <label
                        key={method.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#c5ccd2] bg-white p-4"
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={methodId === method.id}
                          onChange={() => {
                            setMethodId(method.id);
                            setInstructions(undefined);
                          }}
                          className="mt-1"
                        />
                        <span>
                          <span className="block font-semibold">
                            {method.label}
                          </span>
                          {method.description && (
                            <span className="mt-1 block text-xs text-[#536474]">
                              {method.description}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                )}
                {methodsLoading &&
                  client.getPaymentMethods &&
                  paymentEnabled && (
                    <p role="status" className="mt-5 text-sm">
                      Loading supported payment methods…
                    </p>
                  )}
                {!methods.length &&
                  (!methodsLoading || !client.getPaymentMethods) &&
                  paymentEnabled && (
                    <p className="mt-5 rounded bg-amber-100 p-4 text-sm">
                      No supported payment methods have been returned. Payment
                      cannot start.
                    </p>
                  )}
                {instructionsActive && instructions?.message && (
                  <p className="mt-6 text-sm leading-6">
                    {instructions.message}
                  </p>
                )}
                {paymentQr && (
                  <div className="relative mx-auto mt-6 aspect-square w-full max-w-72">
                    <Image
                      src={paymentQr}
                      alt="Payment QR supplied by the supported payment service"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                )}
                {paymentRedirect && (
                  <a
                    href={paymentRedirect}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${primary} mt-6`}
                  >
                    Open secure payment page
                  </a>
                )}
                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={
                      busy ||
                      !paymentEnabled ||
                      !methodId ||
                      !client.startPayment ||
                      (attemptStarted && booking.paymentStatus !== "FAILED")
                    }
                    onClick={startPayment}
                    className={primary}
                  >
                    {busy
                      ? "Contacting payment service…"
                      : attemptStarted && booking.paymentStatus !== "FAILED"
                        ? "Payment started"
                        : "Start payment"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void refresh()}
                    className="min-h-11 rounded-lg border border-[#6c7883] px-5 text-sm font-semibold"
                  >
                    Refresh payment status
                  </button>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-[#9aa4ae]">
                Opening, closing, or returning from the payment service does not
                prove payment. Retry does not renew the original reservation
                deadline.
              </p>
            </div>
            <aside className="space-y-6">
              <div className={panel}>
                <Totals booking={booking} />
              </div>
              <ItemList booking={booking} />
              <Link
                href={`/bookings/${encodeURIComponent(bookingId)}/summary`}
                className={`${secondary} w-full`}
              >
                Back to Summary
              </Link>
              {cancellationEnabled && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setCancelIntent("cancel")}
                  className="min-h-11 w-full rounded-lg border border-red-400/40 px-5 py-3 text-sm font-semibold text-red-300"
                >
                  Cancel Payment & release reservation
                </button>
              )}
            </aside>
          </section>
        )}

        {mode === "confirmation" && (
          <section>
            <p
              role="status"
              className={`${panel} mb-8 ${confirmed ? "text-[#66fcf1]" : "text-[#c5c6c7]"}`}
            >
              {booking.event.status === "CANCELLED"
                ? "This event has been cancelled. Its tickets cannot grant admission; check the refund status below."
                : confirmed
                  ? "The booking service has confirmed your payment and booking."
                  : booking.status === "CANCELLED"
                    ? "This booking has been cancelled. It cannot grant admission."
                    : booking.status === "EXPIRED"
                      ? "This booking has expired. No active reservation is implied."
                      : booking.status === "REFUNDED" &&
                          booking.paymentStatus === "REFUNDED"
                        ? "The service reports that this booking has been refunded."
                        : "Your booking is not confirmed. Check the current status before taking further action."}
            </p>
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <Customer booking={booking} />
                <h3 className="mb-5 mt-8 text-lg font-bold">TICKET SUMMARY</h3>
                <ItemList booking={booking} />
                <div className={`${panel} mt-5`}>
                  <Totals booking={booking} />
                </div>
              </div>
              <SeatPlan src={booking.seatPlanUrl} />
            </div>
            {booking.refundStatus &&
              booking.refundStatus !== "NOT_APPLICABLE" && (
                <p className={`${panel} mt-8`}>
                  Refund status: {booking.refundStatus}.{" "}
                  {booking.refundStatus === "REFUNDED" &&
                  booking.paymentStatus === "REFUNDED"
                    ? "Refund completion was reported by the service."
                    : "This does not mean a refund has completed."}
                </p>
              )}
            <div className={`${panel} mt-8`}>
              <h3 className="text-xl font-bold">IMPORTANT INFORMATION</h3>
              <p className="mt-3 text-sm leading-6 text-[#c5c6c7]">
                Keep your booking reference. Admission requires valid issued
                tickets for the displayed event and assigned seats. A browser
                confirmation screen is not itself a ticket.
              </p>
              {confirmed && (
                <ul className="mt-5 space-y-3">
                  {booking.issuedTickets?.map((ticket) =>
                    safeLocalHref(ticket.href) ? (
                      <li key={ticket.id}>
                        <Link
                          href={safeLocalHref(ticket.href)!}
                          className="text-sm text-[#66fcf1] underline"
                        >
                          View ticket for seat {ticket.seatLabel}
                        </Link>
                      </li>
                    ) : null,
                  )}
                </ul>
              )}
              {confirmed && !ticketsHref && !booking.issuedTickets?.length && (
                <p className="mt-4 text-sm text-[#9aa4ae]">
                  Ticket destinations have not yet been supplied by the attendee
                  integration.
                </p>
              )}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              {ticketsHref && (
                <Link href={ticketsHref} className={primary}>
                  View My Tickets
                </Link>
              )}
              {paymentEnabled && (
                <Link
                  href={`/bookings/${encodeURIComponent(bookingId)}/payment`}
                  className={primary}
                >
                  Continue to Payment
                </Link>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void refresh()}
                className={secondary}
              >
                Refresh result
              </button>
              <Link href="/events" className={secondary}>
                Back to Events
              </Link>
            </div>
          </section>
        )}

        {mode !== "confirmation" && !paymentEnabled && (
          <p
            role="status"
            className="mt-8 rounded-lg border border-amber-400/30 bg-amber-400/5 p-5 text-sm leading-6 text-amber-200"
          >
            {confirmed
              ? "This booking is already confirmed. Do not pay again."
              : "Payment is not currently available for this booking. Refresh its current state or return to the event."}{" "}
            <Link
              href={`/bookings/${encodeURIComponent(bookingId)}/confirmation`}
              className="underline"
            >
              View booking result
            </Link>
          </p>
        )}
        <Dialog
          open={cancelIntent !== null}
          onClose={() => {
            if (!busy) setCancelIntent(null);
          }}
          title={
            cancelIntent === "edit"
              ? "Cancel this reservation to edit?"
              : "Cancel this unpaid reservation?"
          }
        >
          <p className="my-6 text-sm leading-6 text-[#c5c6c7]">
            This explicitly requests cancellation of the eligible unpaid booking
            and release of its numbered seats. Availability is not guaranteed if
            you select again.
          </p>
          <button
            type="button"
            disabled={busy || !cancellationEnabled}
            onClick={cancelReservation}
            className="min-h-11 w-full rounded-lg bg-red-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? "Requesting cancellation…" : "Cancel reservation"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setCancelIntent(null)}
            className={`${secondary} mt-3 w-full`}
          >
            Keep reservation
          </button>
        </Dialog>
      </div>
    </PageShell>
  );
}

function Customer({ booking }: { booking: BookingRecord }) {
  return (
    <section className={`${panel} mt-6`}>
      <h3 className="mb-4 font-bold">CUSTOMER INFORMATION</h3>
      <dl className="space-y-3 text-sm">
        <div className="grid gap-1 sm:grid-cols-[90px_1fr]">
          <dt className="text-[#9aa4ae]">Name</dt>
          <dd>{booking.attendee.name}</dd>
        </div>
        <div className="grid gap-1 sm:grid-cols-[90px_1fr]">
          <dt className="text-[#9aa4ae]">Email</dt>
          <dd className="break-all">{booking.attendee.email}</dd>
        </div>
        {booking.attendee.phoneNumber && (
          <div className="grid gap-1 sm:grid-cols-[90px_1fr]">
            <dt className="text-[#9aa4ae]">Contact</dt>
            <dd>{booking.attendee.phoneNumber}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
