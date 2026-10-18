"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import { useAccountSession } from "@/components/auth/useAccountSession";
import { publicAuthClient, type PublicAuthClient } from "@/lib/auth/client";
import { authHref } from "@/lib/auth/destination";
import {
  publicBookingClient,
  BookingClientError,
  bookingErrorMessage,
  type PublicBookingClient,
} from "@/lib/booking/client";
import { readDraft, saveDraft, clearDraft } from "@/lib/booking/draft";
import {
  assertMatchesDraft,
  draftEstimate,
  refreshDraft,
  toggleSeat,
  validateDraft,
} from "@/lib/booking/rules";
import {
  requireBooking,
  requireOptions,
  requireSeats,
} from "@/lib/booking/validate";
import { formatBookingAmount as formatPrice } from "@/lib/booking/format";
import type {
  BookingDraft,
  EventSeat,
  TicketOptions,
} from "@/lib/booking/types";
import {
  BookingHeading,
  ErrorNotice,
  primary,
  secondary,
  panel,
} from "./BookingPrimitives";

export default function SeatSelection({
  eventId,
  client = publicBookingClient,
  auth = publicAuthClient,
}: {
  eventId: string;
  client?: PublicBookingClient;
  auth?: PublicAuthClient;
}) {
  const access = useAccountSession(auth);
  const router = useRouter();
  const [options, setOptions] = useState<TicketOptions>();
  const [seats, setSeats] = useState<EventSeat[]>([]);
  const [draft, setDraft] = useState<BookingDraft>({
    version: 1,
    eventId,
    items: [],
  });
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const busyRef = useRef(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!access.session?.canBook) return;
    let active = true;
    async function load() {
      try {
        if (!client.getTicketOptions || !client.getSeats)
          throw new BookingClientError("UNAVAILABLE");
        const next = requireOptions(
          await client.getTicketOptions(eventId),
          eventId,
        );
        const layout = requireSeats(await client.getSeats(eventId), next);
        const saved = readDraft(eventId);
        const refreshed = refreshDraft(saved, layout);
        // Keep an operation identity after an uncertain request; never auto-retry it.
        refreshed.operationKey = saved.operationKey;
        if (active) {
          setOptions(next);
          setSeats(layout);
          setDraft(refreshed);
          setCategoryId(refreshed.items[0]?.ticketCategoryId ?? "");
          setUncertain(!!saved.operationKey);
          saveDraft(refreshed);
        }
      } catch (e) {
        if (active) {
          setOptions(undefined);
          setError(bookingErrorMessage(e));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [eventId, client, access.session, reload]);

  async function reserve() {
    if (busyRef.current || uncertain || !options) return;
    const problems = validateDraft(draft, options, seats);
    if (problems.length) {
      setError(problems.join(" "));
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    let attempted = false;
    try {
      if (!client.createBooking) throw new BookingClientError("UNAVAILABLE");
      const operationKey = draft.operationKey ?? crypto.randomUUID();
      const request = { ...draft, operationKey };
      if (!saveDraft(request)) throw new Error("Selection cannot be saved");
      attempted = true;
      const booking = requireBooking(
        await client.createBooking(request, operationKey),
      );
      assertMatchesDraft(booking, request);
      clearDraft(eventId);
      router.push(`/bookings/${encodeURIComponent(booking.id)}/summary`);
    } catch (e) {
      setError(bookingErrorMessage(e));
      const knownAtomicRejection =
        e instanceof BookingClientError &&
        [
          "SEAT_UNAVAILABLE",
          "SEAT_SELECTION_INVALID",
          "PURCHASE_LIMIT_EXCEEDED",
          "BOOKING_EVENT_MISMATCH",
          "INVENTORY_CHANGED",
          "UNAUTHENTICATED",
          "FORBIDDEN",
        ].includes(e.code);
      if (attempted && !knownAtomicRejection) setUncertain(true);
      if (knownAtomicRejection) {
        const next = { ...draft, operationKey: undefined };
        saveDraft(next);
        setDraft(next);
        if (
          [
            "SEAT_UNAVAILABLE",
            "INVENTORY_CHANGED",
            "PURCHASE_LIMIT_EXCEEDED",
          ].includes(e.code)
        ) {
          setLoading(true);
          setReload((n) => n + 1);
        }
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  function choose(seat: EventSeat) {
    if (busy || uncertain) return;
    const next = toggleSeat(draft, seat);
    setDraft(next);
    setError("");
    if (!saveDraft(next))
      setError(
        "Your browser could not save the selected seats. No reservation has been created.",
      );
  }

  const ticketHref = `/events/${encodeURIComponent(eventId)}/tickets`;
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
        <div className="mx-auto max-w-2xl px-6 py-20">
          <h1 className="font-display text-3xl font-bold">
            Log in to select numbered seats
          </h1>
          <p className="mt-5 text-[#c5c6c7]">
            {access.unavailable
              ? "The shared account service is not connected. No reservation can be created."
              : "Your account must be verified before selecting seats."}
          </p>
          <Link
            href={authHref("/login", ticketHref)}
            className={`${primary} mt-6`}
          >
            Log in
          </Link>
        </div>
      </PageShell>
    );
  if (!access.session.canBook)
    return (
      <PageShell>
        <div className="p-10">
          <h1 className="text-3xl font-bold">
            Seat selection is unavailable for this account
          </h1>
          <Link href={ticketHref} className={`${secondary} mt-6`}>
            Back to tickets
          </Link>
        </div>
      </PageShell>
    );
  if (!options)
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h1 className="text-3xl font-bold">Select your seat plan</h1>
          {loading ? (
            <p role="status" className="mt-5">
              Loading numbered-seat availability…
            </p>
          ) : (
            <ErrorNotice message={error} />
          )}
          <Link href={ticketHref} className={`${secondary} mt-6`}>
            Back to tickets
          </Link>
        </div>
      </PageShell>
    );

  const categorySeats = seats.filter((s) => s.ticketCategoryId === categoryId);
  const groups = new Map<string, EventSeat[]>();
  for (const seat of categorySeats) {
    const key = [seat.section, seat.row].filter(Boolean).join(" · ") || "Seats";
    groups.set(key, [...(groups.get(key) ?? []), seat]);
  }
  const selected = draft.items.flatMap((i) => i.seatIds);
  const required = draft.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <PageShell>
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-16">
        <BookingHeading
          name="Select your seat plan"
          date={options.event.startsAt}
          venue={options.event.venue.name}
          backHref={ticketHref}
          backLabel="Back to tickets"
        />
        <p className="mb-6 text-sm text-[#c5c6c7]">
          {options.event.name}. Seats shown are current service data; selecting
          them does not hold them.
        </p>
        {uncertain && (
          <ErrorNotice message="A booking request may already exist for this selection. Creating another is blocked. Check your booking history with the team’s attendee page or contact support before starting over." />
        )}
        {error && <ErrorNotice message={error} />}
        {!draft.items.length ? (
          <div className={panel}>
            <p>Choose ticket categories and quantities first.</p>
            <Link href={ticketHref} className={`${primary} mt-5`}>
              Choose tickets
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="min-w-0">
              <label
                htmlFor="seat-category"
                className="mb-3 block text-sm font-semibold"
              >
                Ticket category
              </label>
              <select
                id="seat-category"
                value={categoryId}
                disabled={busy || uncertain}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mb-8 min-h-12 w-full rounded-lg border border-[#2c3644] bg-[#1f2833] px-4"
              >
                {draft.items.map((i) => (
                  <option key={i.ticketCategoryId} value={i.ticketCategoryId}>
                    {
                      options.event.categories.find(
                        (c) => c.id === i.ticketCategoryId,
                      )?.name
                    }{" "}
                    — choose {i.quantity} seats
                  </option>
                ))}
              </select>
              <h2 className="mb-10 border-y border-[#2c3644] py-6 text-center font-display text-4xl font-bold">
                STAGE
              </h2>
              {!categorySeats.length && (
                <p className={panel}>
                  No numbered-seat layout is available for this category. This
                  step cannot be skipped.
                </p>
              )}
              <div className="space-y-6">
                {Array.from(groups).map(([label, rowSeats]) => (
                  <section key={label} id={Array.from(groups).find(([, group]) => group[0]?.section === rowSeats[0]?.section)?.[0] === label ? `section-${encodeURIComponent(rowSeats[0]?.section || label)}` : undefined} className="scroll-mt-28" aria-label={label}>
                    <h3 className="mb-3 text-xs font-semibold text-[#9aa4ae]">
                      {label}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {rowSeats.map((seat) => {
                        const chosen = selected.includes(seat.id);
                        return (
                          <button
                            key={seat.id}
                            type="button"
                            disabled={
                              seat.status !== "AVAILABLE" || busy || uncertain
                            }
                            aria-label={`${seat.displayLabel}, ${chosen ? "selected" : seat.status.toLowerCase()}`}
                            aria-pressed={chosen}
                            title={`${seat.displayLabel} · ${seat.status}`}
                            onClick={() => choose(seat)}
                            className={`min-h-11 min-w-11 rounded-sm border px-2 text-xs font-semibold ${chosen ? "border-[#66fcf1] bg-[#66fcf1] text-[#0b0c10]" : seat.status === "AVAILABLE" ? "border-[#66fcf1] bg-white text-[#0b0c10] hover:bg-[#b9fff9]" : "cursor-not-allowed border-[#666] bg-[#a6a6a6] text-[#343434]"}`}
                          >
                            {seat.seatNumber}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>
            <aside className="space-y-6 border-[#26303b] lg:border-l lg:pl-7">
              <h2 className="font-display text-xl font-bold">Seat selection</h2>
              <ul className="space-y-4 text-sm">
                <li className="flex items-center gap-3">
                  <span className="h-6 w-6 bg-[#a6a6a6]" />
                  Unavailable / held / sold
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-6 w-6 bg-[#66fcf1]" />
                  Selected in browser
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-6 w-6 border border-[#66fcf1] bg-white" />
                  Available
                </li>
              </ul>
              <p role="status" className="text-sm text-[#c5c6c7]">
                Selected {selected.length} of {required} required numbered
                seats.
              </p>
              <ul className="space-y-2 text-sm text-[#66fcf1]">
                {selected.map((id) => (
                  <li key={id}>
                    {seats.find((s) => s.id === id)?.displayLabel}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[#9aa4ae]">Estimated subtotal</p>
              <p className="text-2xl font-bold">
                {formatPrice(draftEstimate(draft, options))}
              </p>
              <button
                type="button"
                disabled={
                  busy || uncertain || !required || selected.length !== required
                }
                onClick={reserve}
                className={`${primary} w-full`}
              >
                {busy ? "Requesting reservation…" : "Confirm seats & review"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setLoading(true);
                  setReload((n) => n + 1);
                }}
                className={`${secondary} w-full`}
              >
                Refresh seat availability
              </button>
              <p className="text-xs leading-5 text-[#9aa4ae]">
                The server may reject a concurrent seat claim or
                cumulative-limit change. All requested seats must succeed
                together.
              </p>
            </aside>
          </div>
        )}
      </div>
    </PageShell>
  );
}
