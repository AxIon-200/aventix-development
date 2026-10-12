"use client";

import { useEffect, useState } from "react";
import { AdminEvent, AdminEventDetails } from "@/app/admin/types/events";
import { getEventById } from "@/app/admin/services/eventService";
import { formatDate } from "@/app/admin/lib/format";
import { formatPeso } from "@/app/admin/lib/currency";
import { Modal } from "@/app/admin/components/ui/Modal";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import {
  EVENT_CATEGORY_LABEL,
  EventStatusBadge,
} from "@/app/admin/components/events/eventStatus";

type Props = {
  eventId: string | null; // null = closed
  onClose: () => void;
  onManageAvailability: (event: Pick<AdminEvent, "id" | "title" | "status" | "attendees">) => void;
};

export function EventDetailsModal({ eventId, onClose, onManageAvailability }: Props) {
  const [event, setEvent] = useState<AdminEventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    setEvent(null);
    setError(null);
    setIsLoading(true);
    getEventById(eventId)
      .then((e) => !cancelled && setEvent(e))
      .catch((e) => !cancelled && setError(e?.message ?? "Something went wrong"))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [eventId, tick]);

  const facts: [string, string][] = event
    ? [
        ["Organizer", event.organizerName],
        ["Category", EVENT_CATEGORY_LABEL[event.category]],
        ["Date", formatDate(event.startsAt)],
        ["Venue", event.venue],
        ["Attendees", `${event.attendees.toLocaleString()} of ${event.capacity.toLocaleString()}`],
        ["Revenue", formatPeso(event.revenue)],
      ]
    : [];

  const fill = event && event.capacity > 0 ? Math.min(100, Math.round((event.attendees / event.capacity) * 100)) : 0;

  return (
    <Modal
      isOpen={eventId !== null}
      onClose={onClose}
      title="Event details"
      size="lg"
      footer={
        <>
          {event && (
            <button
              onClick={() => onManageAvailability(event)}
              className="rounded-lg bg-teal-500/10 px-3.5 py-2 text-sm font-medium text-teal-300 hover:bg-teal-500/20"
            >
              Manage availability
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
            <div className="h-5 w-2/3 animate-pulse rounded bg-white/5" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-white/5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
          <div className="h-24 animate-pulse rounded-lg bg-white/5" />
        </div>
      )}

      {!isLoading && error && (
        <ErrorState compact title="Couldn't load event" message={error} onRetry={() => setTick((t) => t + 1)} />
      )}

      {!isLoading && event && (
        <div className="space-y-5">
          <div>
            <p className="text-base font-semibold text-white">{event.title}</p>
            <p className="mb-1.5 text-xs text-slate-500">{event.eventCode}</p>
            <EventStatusBadge status={event.status} />
            {event.description && <p className="mt-3 text-sm text-slate-400">{event.description}</p>}
          </div>

          {event.status === "cancelled" && event.cancellationReason && (
            <div className="rounded-lg border border-rose-400/20 bg-rose-500/5 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wider text-rose-300/80">Cancellation reason</p>
              <p className="mt-0.5 text-sm text-slate-300">{event.cancellationReason}</p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3">
            {facts.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
                <dd className="mt-0.5 truncate text-sm text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-slate-500">Capacity filled</span>
              <span className="text-slate-400">{fill}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5">
              <div className="h-1.5 rounded-full bg-teal-400" style={{ width: `${fill}%` }} />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Ticket tiers</h3>
            {event.tiers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 py-6 text-center text-sm text-slate-500">
                No ticket tiers have been set up for this event.
              </p>
            ) : (
              <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
                {event.tiers.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div>
                      <p className="text-sm text-slate-200">{t.name}</p>
                      <p className="text-[11px] text-slate-500">{formatPeso(t.price)} each</p>
                    </div>
                    <p className="text-sm text-slate-300">
                      {t.sold.toLocaleString()} <span className="text-slate-600">/ {t.capacity.toLocaleString()} sold</span>
                    </p>
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
