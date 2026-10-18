"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import { useAccountSession } from "@/components/auth/useAccountSession";
import { publicAuthClient, type PublicAuthClient } from "@/lib/auth/client";
import {
  publicBookingClient,
  bookingErrorMessage,
  BookingClientError,
  type PublicBookingClient,
} from "@/lib/booking/client";
import { readDraft, saveDraft } from "@/lib/booking/draft";
import {
  draftEstimate,
  remainingAllowance,
  setQuantity,
  validateDraft,
} from "@/lib/booking/rules";
import { requireOptions } from "@/lib/booking/validate";
import { categoryStateLabel, isCategoryBookable } from "@/lib/event-booking";
import { formatBookingAmount as formatPrice } from "@/lib/booking/format";
import type { BookingDraft, TicketOptions } from "@/lib/booking/types";
import {
  BookingHeading,
  ErrorNotice,
  panel,
  primary,
  secondary,
  SeatPlan,
} from "./BookingPrimitives";

export default function TicketSelection({
  eventId,
  initialCategory,
  fallback,
  client = publicBookingClient,
  auth = publicAuthClient,
}: {
  eventId: string;
  initialCategory?: string;
  fallback: React.ReactNode;
  client?: PublicBookingClient;
  auth?: PublicAuthClient;
}) {
  const access = useAccountSession(auth);
  const router = useRouter();
  const [options, setOptions] = useState<TicketOptions>();
  const [draft, setDraft] = useState<BookingDraft>({
    version: 1,
    eventId,
    items: [],
  });
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!access.session?.canBook) return;
    let active = true;
    async function load() {
      try {
        if (!client.getTicketOptions)
          throw new BookingClientError("UNAVAILABLE");
        const next = requireOptions(
          await client.getTicketOptions(eventId),
          eventId,
        );
        if (active) {
          setOptions(next);
          setDraft(readDraft(eventId));
          setError("");
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

  if (access.loading)
    return (
      <PageShell>
        <p role="status" className="mx-auto max-w-[1440px] px-6 py-16">
          Checking your account…
        </p>
      </PageShell>
    );
  if (!access.session) return fallback;
  if (!access.session.canBook)
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h1 className="font-display text-3xl font-bold">
            Booking is unavailable for this account
          </h1>
          <p className="mt-4 text-[#c5c6c7]">
            The shared account service has not authorized attendee booking.
            Contact support or use an eligible account.
          </p>
          <Link
            href={`/events/${encodeURIComponent(eventId)}`}
            className={`${secondary} mt-6`}
          >
            Back to Event
          </Link>
        </div>
      </PageShell>
    );
  if (!options)
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h1 className="font-display text-3xl font-bold">Ticket selection</h1>
          {loading ? (
            <p role="status" className="mt-6">
              Loading current ticket options…
            </p>
          ) : (
            <>
              <ErrorNotice message={error} />
              <button
                type="button"
                className={secondary}
                onClick={() => {
                  setLoading(true);
                  setReload((n) => n + 1);
                }}
              >
                Refresh ticket options
              </button>
            </>
          )}
        </div>
      </PageShell>
    );

  function update(categoryId: string, quantity: number) {
    const next = setQuantity(draft, categoryId, quantity);
    setDraft(next);
    setError("");
    if (!saveDraft(next))
      setError(
        "Your browser could not save this selection for the next step. No booking has been created.",
      );
  }
  function next() {
    const errors = validateDraft(draft, options!);
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }
    if (!saveDraft(draft)) {
      setError(
        "Browser storage is unavailable. Your selection cannot be carried to numbered-seat selection.",
      );
      return;
    }
    router.push(`/events/${encodeURIComponent(eventId)}/seats`);
  }
  return (
    <PageShell>
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-[72px]">
        <BookingHeading
          name={options.event.name}
          date={options.event.startsAt}
          venue={options.event.venue.name}
          backHref={`/events/${encodeURIComponent(eventId)}`}
        />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,408px)_minmax(0,1fr)]">
          <SeatPlan src={options.seatPlanUrl} />
          <section
            className="min-w-0"
            aria-labelledby="ticket-selection-heading"
          >
            <h2
              id="ticket-selection-heading"
              className="border-b border-[#26303b] pb-4 text-lg font-bold"
            >
              TICKETS
            </h2>
            <p className="my-4 text-sm text-[#9aa4ae]">
              Event limit: {options.purchaseLimit}. Confirmed:{" "}
              {options.confirmedQuantity}. Active holds: {options.heldQuantity}.
              You can select up to {remainingAllowance(options)} more.
            </p>
            {!options.event.categories.length && (
              <p className={panel}>No ticket categories are available.</p>
            )}
            <ul className="space-y-3">
              {options.event.categories.map((category) => {
                const quantity =
                  draft.items.find((i) => i.ticketCategoryId === category.id)
                    ?.quantity ?? 0;
                const bookable = isCategoryBookable(options.event, category);
                const maximum = Math.min(
                  remainingAllowance(options),
                  category.remaining ?? Infinity,
                  options.categoryLimits?.[category.id] ?? Infinity,
                );
                return (
                  <li
                    key={category.id}
                    className={`${panel} ${initialCategory === category.id ? "border-[#66fcf1]/60" : ""}`}
                  >
                    <div className="flex flex-wrap justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold uppercase">
                          {category.name}
                        </h3>
                        {category.description && (
                          <p className="mt-2 text-xs leading-5 text-[#9aa4ae]">
                            {category.description}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-[#66fcf1]">
                          {bookable
                            ? `${category.remaining ?? "Current"} available · numbered seats required`
                            : categoryStateLabel(options.event, category)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {formatPrice(category.price)}
                      </p>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                      <span className="text-xs text-[#9aa4ae]">
                        Choose numbered seats on the next step
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className={`${secondary} px-4`}
                          disabled={quantity <= 0}
                          aria-label={`Remove one ${category.name} ticket`}
                          onClick={() =>
                            update(category.id, Math.max(0, quantity - 1))
                          }
                        >
                          −
                        </button>
                        <label
                          className="sr-only"
                          htmlFor={`quantity-${category.id}`}
                        >
                          {category.name} quantity
                        </label>
                        <input
                          id={`quantity-${category.id}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={Number.isFinite(maximum) ? maximum : undefined}
                          step={1}
                          disabled={!bookable}
                          value={quantity}
                          onChange={(e) =>
                            update(category.id, Number(e.target.value))
                          }
                          className="h-11 w-20 rounded-lg border border-[#2c3644] bg-[#1f2833] px-3 text-center text-sm"
                        />
                        <button
                          type="button"
                          className={`${primary} px-4`}
                          disabled={!bookable || quantity >= maximum}
                          aria-label={`Add one ${category.name} ticket`}
                          onClick={() => update(category.id, quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {error && <ErrorNotice message={error} />}
            <div className={`${panel} mt-6`}>
              <div className="flex justify-between gap-4 text-lg font-bold">
                <span>Estimated subtotal</span>
                <span className="text-[#66fcf1]">
                  {formatPrice(draftEstimate(draft, options))}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#9aa4ae]">
                This is an estimate. The server will validate inventory, your
                cumulative limit, configured fees, and all prices before
                creating a hold.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={next} className={primary}>
                  Continue to numbered seats
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setReload((n) => n + 1);
                  }}
                  className={secondary}
                >
                  Refresh availability
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
