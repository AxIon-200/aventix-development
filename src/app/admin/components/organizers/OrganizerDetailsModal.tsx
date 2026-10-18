"use client";

import { useEffect, useState } from "react";
import { Organizer, OrganizerDecision, OrganizerDetails } from "@/app/admin/types/organizers";
import { getOrganizerById } from "@/app/admin/services/organizerService";
import { formatDate } from "@/app/admin/lib/format";
import { Modal } from "@/app/admin/components/ui/Modal";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import { Avatar } from "@/app/admin/components/ui/Avatar";
import { StatusBadge } from "@/app/admin/components/ui/StatusBadge";
import { OrganizerStatusBadge } from "@/app/admin/components/organizers/organizerStatus";

type Props = {
  organizerId: string | null; // null = closed
  onClose: () => void;
  onDecide: (organizer: Pick<Organizer, "id" | "name">, decision: OrganizerDecision) => void;
};

export function OrganizerDetailsModal({ organizerId, onClose, onDecide }: Props) {
  const [org, setOrg] = useState<OrganizerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!organizerId) return;
    let cancelled = false;
    setOrg(null);
    setError(null);
    setIsLoading(true);
    getOrganizerById(organizerId)
      .then((o) => !cancelled && setOrg(o))
      .catch((e) => !cancelled && setError(e?.message ?? "Something went wrong"))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [organizerId, tick]);

  const facts: [string, string][] = org
    ? [
        ["Email", org.email],
        ["Phone", org.phone || "—"],
        ["Applied on", formatDate(org.appliedAt)],
        ["Total events", org.eventsCount.toLocaleString()],
        ["Published / Draft", `${org.publishedEvents} / ${org.draftEvents}`],
        ["Tickets sold", org.ticketsSold.toLocaleString()],
      ]
    : [];

  return (
    <Modal
      isOpen={organizerId !== null}
      onClose={onClose}
      title="Organizer details"
      size="lg"
      footer={
        <>
          {org && org.status !== "approved" && (
            <button
              onClick={() => onDecide(org, "approved")}
              className="rounded-lg bg-teal-500/10 px-3.5 py-2 text-sm font-medium text-teal-300 hover:bg-teal-500/20"
            >
              Approve
            </button>
          )}
          {org && org.status !== "rejected" && (
            <button
              onClick={() => onDecide(org, "rejected")}
              className="rounded-lg bg-rose-500/10 px-3.5 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/20"
            >
              Reject
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
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 animate-pulse rounded-full bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-white/5" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
            </div>
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
        <ErrorState compact title="Couldn't load organizer" message={error} onRetry={() => setTick((t) => t + 1)} />
      )}

      {!isLoading && org && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={org.name} src={org.avatarUrl} size="lg" />
            <div>
              <p className="text-base font-semibold text-white">{org.name}</p>
              <p className="mb-1.5 text-xs text-slate-500">{org.organizerCode}</p>
              <OrganizerStatusBadge status={org.status} />
            </div>
          </div>

          {org.status === "rejected" && org.rejectionReason && (
            <div className="rounded-lg border border-rose-400/20 bg-rose-500/5 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wider text-rose-300/80">Rejection reason</p>
              <p className="mt-0.5 text-sm text-slate-300">{org.rejectionReason}</p>
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
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent events
            </h3>
            {org.recentEvents.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 py-6 text-center text-sm text-slate-500">
                This organizer hasn&apos;t created any events yet.
              </p>
            ) : (
              <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
                {org.recentEvents.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-200">{e.title}</p>
                      <p className="text-[11px] text-slate-500">{formatDate(e.date)}</p>
                    </div>
                    <StatusBadge
                      label={e.status === "published" ? "Published" : "Draft"}
                      tone={e.status === "published" ? "success" : "neutral"}
                    />
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
