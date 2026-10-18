"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { OrganizerDecision } from "@/app/admin/types/organizers";
import { Modal } from "@/app/admin/components/ui/Modal";

export type DecisionTarget = {
  organizer: { id: string; name: string };
  decision: OrganizerDecision;
};

type Props = {
  target: DecisionTarget | null; // null = closed
  isLoading: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
};

const MAX_REASON = 500;

// Like ConfirmDialog, plus an optional reason box when rejecting.
export function OrganizerDecisionDialog({ target, isLoading, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    setReason("");
  }, [target]);

  const approving = target?.decision === "approved";
  const Icon = approving ? CheckCircle2 : AlertTriangle;

  return (
    <Modal
      isOpen={target !== null}
      onClose={onCancel}
      title={approving ? "Approve this organizer?" : "Reject this organizer?"}
      size="sm"
      closeDisabled={isLoading}
      footer={
        <>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-white/10 px-3.5 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(approving ? undefined : reason.trim() || undefined)}
            disabled={isLoading}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium disabled:opacity-60 ${
              approving
                ? "bg-teal-500 text-slate-950 hover:bg-teal-400"
                : "bg-rose-500 text-white hover:bg-rose-400"
            }`}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {approving ? "Approve" : "Reject"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              approving ? "bg-teal-500/10 text-teal-400" : "bg-rose-500/10 text-rose-400"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            {approving
              ? `${target?.organizer.name} will be approved and can create and publish events on Aventix.`
              : `${target?.organizer.name} will lose access to organizer tools and won't be able to publish events.`}
          </p>
        </div>

        {!approving && (
          <div>
            <label htmlFor="reject-reason" className="text-xs font-medium text-slate-400">
              Reason <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
              disabled={isLoading}
              rows={3}
              placeholder="Shown to the organizer in their rejection notice"
              className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-teal-400/60 disabled:opacity-60"
            />
            <p className="mt-1 text-right text-[11px] text-slate-600">
              {reason.length}/{MAX_REASON}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
