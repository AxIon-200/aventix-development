"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrganizerDecision, OrganizerDetails } from "@/app/admin/types/organizers";
import { getOrganizerById, retryOrganizerEmail } from "@/app/admin/services/organizerService";
import { Modal } from "@/app/admin/components/ui/Modal";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import { OrganizerStatusBadge } from "@/app/admin/components/organizers/organizerStatus";

type Props = {
  organizerId: string | null;
  onClose: () => void;
  onDecide: (organization: OrganizerDetails, decision: OrganizerDecision) => void;
  onNotice: (message: string) => void;
};

export function OrganizerDetailsModal({ organizerId, onClose, onDecide, onNotice }: Props) {
  const [organization, setOrganization] = useState<OrganizerDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!organizerId) return;
    let active = true;
    getOrganizerById(organizerId).then(data => { if (active) setOrganization(data); })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizerId, refresh]);

  const retry = useCallback(async (decisionId: string) => {
    if (!organizerId) return;
    setRetrying(true);
    try {
      const result = await retryOrganizerEmail(organizerId, decisionId);
      onNotice(result.emailStatus === "ACCEPTED" ? "Decision email accepted by the provider." : "Email delivery is still unconfirmed. You can retry from this history.");
      setError(null); setLoading(true);
      setRefresh(value => value + 1);
    } catch (reason) { onNotice(reason instanceof Error ? reason.message : "Could not retry the email."); }
    finally { setRetrying(false); }
  }, [organizerId, onNotice]);

  return <Modal isOpen={organizerId !== null} onClose={onClose} title="Organizer application" size="lg">
    {loading && <p className="text-sm text-slate-400">Loading application…</p>}
    {error && <ErrorState compact title="Couldn't load organizer" message={error} onRetry={() => { setError(null); setLoading(true); setRefresh(value => value + 1); }} />}
    {organization && <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1 text-sm text-slate-300">
      <div><h3 className="text-lg font-semibold text-white">{organization.organizationName}</h3><OrganizerStatusBadge status={organization.status} />
        <p className="mt-2">Current contact: {organization.currentContact.email}</p>
        {!organization.currentContact.emailVerified && <p className="mt-1 text-amber-300">The applicant must verify their email before a decision.</p>}
      </div>
      <section><h4 className="font-semibold text-white">Submitted application</h4>
        {organization.application ? <dl className="mt-2 space-y-1">
          <div><dt className="inline text-slate-500">Applicant: </dt><dd className="inline">{organization.application.firstName} {organization.application.lastName}</dd></div>
          <div><dt className="inline text-slate-500">Email: </dt><dd className="inline">{organization.application.email}</dd></div>
          <div><dt className="inline text-slate-500">Phone: </dt><dd className="inline">{organization.application.phoneNumber || "—"}</dd></div>
          <div><dt className="inline text-slate-500">Submitted: </dt><dd className="inline">{new Date(organization.application.submittedAt).toLocaleString()}</dd></div>
          <div className="pt-2"><dt className="text-slate-500">Event plan</dt><dd className="whitespace-pre-wrap">{organization.application.organizationDescription}</dd></div>
        </dl> : <p className="mt-2">No submitted application snapshot is available.</p>}
      </section>
      <section><h4 className="font-semibold text-white">Decision history</h4>
        {organization.decisions.length === 0 ? <p className="mt-2 text-slate-500">No decisions yet.</p>
          : <ul className="mt-2 space-y-2">{organization.decisions.map(decision => <li key={decision.id} className="rounded-lg border border-white/10 p-3">
            <p className="font-medium text-white">{decision.previousStatus} → {decision.resultingStatus}</p>
            <p className="text-xs text-slate-500">{new Date(decision.decidedAt).toLocaleString()} · Email: {decision.emailStatus.toLowerCase()}</p>
            {decision.reason && <p className="mt-1 whitespace-pre-wrap">Reason: {decision.reason}</p>}
            {["PENDING", "FAILED", "UNCERTAIN"].includes(decision.emailStatus) && decision.version === organization.version &&
              <button onClick={() => retry(decision.id)} disabled={retrying} className="mt-2 rounded border border-teal-500/40 px-2 py-1 text-xs text-teal-300 disabled:opacity-50">Retry email</button>}
          </li>)}</ul>}
      </section>
      <section><h4 className="font-semibold text-white">Recent events</h4>
        {organization.recentEvents.length === 0 ? <p className="mt-2 text-slate-500">No events yet.</p>
          : <ul className="mt-2 space-y-1">{organization.recentEvents.map(event => <li key={event.id}>{event.name} · {event.status}</li>)}</ul>}
      </section>
      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
        {organization.status === "pending" && <><button onClick={() => onDecide(organization, "APPROVED")} className="rounded-lg bg-teal-500 px-3 py-2 text-slate-950">Approve</button>
          <button onClick={() => onDecide(organization, "REJECTED")} className="rounded-lg bg-rose-500 px-3 py-2 text-white">Reject</button></>}
        {organization.status === "approved" && <button onClick={() => onDecide(organization, "SUSPENDED")} className="rounded-lg bg-rose-500 px-3 py-2 text-white">Suspend</button>}
        {organization.status === "suspended" && <button onClick={() => onDecide(organization, "APPROVED")} className="rounded-lg bg-teal-500 px-3 py-2 text-slate-950">Reinstate</button>}
        <button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-2">Close</button>
      </div>
    </div>}
  </Modal>;
}
