"use client";

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Modal } from "@/app/admin/components/ui/Modal";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "primary" | "danger";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  variant = "primary",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const danger = variant === "danger";
  const Icon = danger ? AlertTriangle : CheckCircle2;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
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
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium disabled:opacity-60 ${
              danger
                ? "bg-red-500 text-white hover:bg-red-400"
                : "bg-teal-500 text-slate-950 hover:bg-teal-400"
            }`}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            danger ? "bg-red-500/10 text-red-400" : "bg-teal-500/10 text-teal-400"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-sm leading-relaxed text-slate-400">{description}</p>
      </div>
    </Modal>
  );
}
