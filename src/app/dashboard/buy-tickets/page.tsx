import { getEvents } from "@/lib/events-api";
import type { EventDetails } from "@/types/event";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import InteractiveTicketFlow, { type BookingAttendee } from "@/components/booking/InteractiveTicketFlow";
import WorkspaceScreen from "@/components/auth/WorkspaceScreen";
import { currentServerAccount } from "@/lib/auth/server";
import { AuthClientError } from "@/lib/auth/errors";
import { authHref } from "@/lib/auth/destination";
import type { AccountState } from "@/lib/auth/account-session";

export const metadata: Metadata = {
  title: "Buy Tickets & Seat Selection | Aventix Attendee",
  description:
    "Select event performance details, ticket tiers, interactive numbered seats, and receive your digital e-ticket.",
};

export default async function BuyTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; category?: string }>;
}) {
  const { eventId, category } = await searchParams;
  const query = new URLSearchParams();
  if (eventId) query.set("eventId", eventId);
  if (category) query.set("category", category);
  const returnTo = `/dashboard/buy-tickets${query.size ? `?${query}` : ""}`;
  let initial: AccountState;
  try {
    initial = { loading: false, session: await currentServerAccount(), unavailable: false };
  } catch (error) {
    initial = { loading: false, session: null, unavailable: true,
      error: error instanceof AuthClientError ? error.code : "UNAVAILABLE" };
  }
  if (!initial.unavailable && !initial.session) redirect(authHref("/login", returnTo));

  const session = initial.session;
  const authorized = !initial.unavailable && session?.role === "ATTENDEE";
  const attendee: BookingAttendee | null = authorized ? {
    userId: session.userId, name: session.displayName,
    email: session.email ?? "", phoneNumber: session.phoneNumber ?? null,
  } : null;
  let events: EventDetails[] = [];
  let eventsUnavailable = false;
  if (authorized) {
    try {
      events = (await getEvents()).filter((event) =>
        event.status === "PUBLISHED" && event.categories.some((category) =>
          category.status === "ACTIVE" &&
          category.availability !== "SOLD_OUT" &&
          category.availability !== "SALE_ENDED" &&
          category.remaining !== 0
        )
      );
    } catch {
      eventsUnavailable = true;
    }
  }
  return (
    <Suspense fallback={<main id="main-content" className="p-8" role="status">Checking your current account…</main>}>
      <WorkspaceScreen role="ATTENDEE" title="Buy Tickets" returnTo={returnTo} initial={initial}>
        {authorized ? <div className="mx-auto max-w-6xl">
          {eventsUnavailable ? (
            <p role="alert" className="rounded-xl border border-white/10 bg-[#111622] p-6 text-slate-300">
              Concert details could not be loaded. Please refresh the page to try again.
            </p>
          ) : (
            <InteractiveTicketFlow
              events={events}
              attendee={attendee}
              initialEventId={eventId}
              initialCategory={category}
            />
          )}
        </div> : undefined}
      </WorkspaceScreen>
    </Suspense>
  );
}
