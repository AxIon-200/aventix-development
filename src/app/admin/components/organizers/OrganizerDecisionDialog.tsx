"use client";

import { useState } from "react";
import type { OrganizerDecision } from "@/app/admin/types/organizers";
import { Modal } from "@/app/admin/components/ui/Modal";

export type DecisionTarget = { id: string; organizationName: string; version: number; decision: OrganizerDecision; previousStatus: string };
type Props = { target: DecisionTarget | null; isLoading: boolean; onConfirm: (reason?: string) => void; onCancel: () => void };
export function OrganizerDecisionDialog({ target, isLoading, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState("");
  const needsReason = target?.decision === "REJECTED" || target?.decision === "SUSPENDED";
  const title = target?.decision === "APPROVED" ? target.previousStatus === "suspended" ? "Reinstate organizer access?" : "Approve this application?"
    : target?.decision === "REJECTED" ? "Reject this application permanently?" : "Suspend organizer access?";
  return <Modal isOpen={target !== null} onClose={onCancel} closeDisabled={isLoading} title={title} size="sm"
    footer={<><button onClick={onCancel} disabled={isLoading} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300">Cancel</button>
      <button onClick={() => onConfirm(needsReason ? reason.trim() : undefined)} disabled={isLoading || (needsReason && !reason.trim())}
        className="rounded-lg bg-teal-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50">Confirm decision</button></>}>
    <p className="text-sm text-slate-300">{target?.organizationName}</p>
    <p className="mt-2 text-sm text-slate-400">{target?.decision === "APPROVED" ? target.previousStatus === "suspended" ? "A fresh login will be required. An email will notify the organizer." : "Approval grants organizer access and sends an email with the ordinary login link."
      : target?.decision === "REJECTED" ? "Rejection is final for this account. The reason will be emailed to the applicant."
      : "Existing organizer sessions will end. The reason will be emailed to the organizer."}</p>
    {needsReason && <div className="mt-4"><label htmlFor="decision-reason" className="text-sm text-slate-300">Reason (required)</label>
      <textarea id="decision-reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={500} rows={3}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] p-2 text-sm text-white" /></div>}
  </Modal>;
}
