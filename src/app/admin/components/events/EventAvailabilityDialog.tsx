"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { EventStatus } from "@/app/admin/types/events";
import { Modal } from "@/app/admin/components/ui/Modal";
import {
  ALLOWED_TRANSITIONS,
  EVENT_STATUS,
  EventStatusBadge,
} from "@/app/admin/components/events/eventStatus";

export type AvailabilityTarget = {
  event: { id: string; title: string; status: EventStatus; attendees: number };
};

type Props = {
  target: AvailabilityTarget | null; // null = closed
  isLoading: boolean;
  onConfirm: (status: EventStatus, reason?: string) => void;
  onCancel: () => void;
};

const MAX_REASON = 500;

function confirmLabel(from: EventStatus, to: EventStatus) {
  if (to === "published") return "Publish event";
  if (to === "cancelled") return "Cancel event";
  return from === "cancelled" ? "Restore as draft" : "Move to draft";
}

export function EventAvailabilityDialog({ target, isLoading, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<EventStatus | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    setSelected(null);
    setReason("");
  }, [target]);

  const event = target?.event;
  const options = event ? ALLOWED_TRANSITIONS[event.status] : [];
  const cancelling = selected === "cancelled";

  return (
    <Modal
      isOpen={target !== null}
      onClose={onCancel}
      title="Manage availability"
      description={event?.title}
      size="md"
      closeDisabled={isLoading}
      footer={
        <>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-white/10 px-3.5 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Keep as is
          </button>
          <button
            onClick={() => selected && onConfirm(selected, cancelling ? reason.trim() || undefined : undefined)}
            disabled={!selected || isLoading}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium disabled:opacity-50 ${
              cancelling
                ? "bg-rose-500 text-white hover:bg-rose-400"
                : "bg-teal-500 text-slate-950 hover:bg-teal-400"
            }`}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {event && selected ? confirmLabel(event.status, selected) : "Choose an option"}
          </button>
        </>
      }
    >
      {event && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            Currently <EventStatusBadge status={event.status} />
          </div>

          <div role="radiogroup" aria-label="New availability" className="space-y-2">
            {options.map((status) => {
              const isSelected = selected === status;
              return (
                <button
                  key={status}
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isLoading}
                  onClick={() => setSelected(status)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${
                    isSelected
                      ? "border-teal-400/60 bg-teal-500/5"
                      : "border-white/10 hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      isSelected ? "border-teal-400" : "border-slate-600"
                    }`}
                  >
                    {isSelected && <span className="h-2 w-2 rounded-full bg-teal-400" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-slate-200">
                      {status === "draft" && event.status === "cancelled"
                        ? "Restore as draft"
                        : EVENT_STATUS[status].label}
                    </span>
                    <span className="block text-xs text-slate-500">{EVENT_STATUS[status].description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {cancelling && event.attendees > 0 && (
            <div className="flex gap-2.5 rounded-lg border border-amber-400/20 bg-amber-500/5 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p className="text-xs leading-relaxed text-amber-200/90">
                {event.attendees.toLocaleString()} attendees hold tickets for this event. Cancelling removes it
                from availability immediately.
              </p>
            </div>
          )}

          {cancelling && (
            <div>
              <label htmlFor="cancel-reason" className="text-xs font-medium text-slate-400">
                Reason <span className="text-slate-600">(optional)</span>
              </label>
              <textarea
                id="cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
                disabled={isLoading}
                rows={3}
                placeholder="Shared with the organizer and attendees"
                className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-teal-400/60 disabled:opacity-60"
              />
              <p className="mt-1 text-right text-[11px] text-slate-600">
                {reason.length}/{MAX_REASON}
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
