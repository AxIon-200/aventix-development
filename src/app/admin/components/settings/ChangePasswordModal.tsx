"use client";

import { FormEvent, useId, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Modal } from "@/app/admin/components/ui/Modal";
import { changePassword } from "@/app/admin/services/settingsService";
import { useToast } from "@/app/admin/components/ui/ToastProvider";

type Props = { onClose: () => void };

const MIN_LENGTH = 15;

type Errors = { current?: string; next?: string; confirm?: string };

function validate(current: string, next: string, confirm: string): Errors {
  const errors: Errors = {};
  if (!current) errors.current = "Enter your current password.";
  if ([...next].length < MIN_LENGTH || [...next].length > 128) errors.next = "Use 15 to 128 characters.";
  else if (next === current) errors.next = "Choose a password different from your current one.";
  if (confirm !== next) errors.confirm = "Passwords don't match.";
  return errors;
}

function PasswordField({
  label,
  value,
  onChange,
  error,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete: string;
  hint?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const messageId = `${id}-msg`;

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-200">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? messageId : undefined}
          className={`w-full rounded-lg border bg-[#0B0F19] py-2 pl-3 pr-10 text-sm text-slate-200 outline-none focus:border-teal-400/60 ${
            error ? "border-red-400/60" : "border-white/10"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-300"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {(error || hint) && (
        <p id={messageId} className={`mt-1 text-xs ${error ? "text-red-400" : "text-slate-500"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

// Mount only while open ({open && <ChangePasswordModal />}) so the form starts empty each time.
export function ChangePasswordModal({ onClose }: Props) {
  const toast = useToast();
  const formId = useId();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Only show field errors after the first submit attempt.
  const errors = submitted ? validate(current, next, confirm) : {};

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(validate(current, next, confirm)).length > 0) return;

    setIsSaving(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      toast.success("Password updated.");
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to change password.");
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Change password"
      description="Use a strong password you don't use anywhere else."
      closeDisabled={isSaving}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-white/10 px-3.5 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-teal-500 px-3.5 py-2 text-sm font-medium text-slate-950 hover:bg-teal-400 disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && (
          <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {serverError}
          </p>
        )}
        <PasswordField
          label="Current password"
          value={current}
          onChange={setCurrent}
          error={errors.current}
          autoComplete="current-password"
        />
        <PasswordField
          label="New password"
          value={next}
          onChange={setNext}
          error={errors.next}
          autoComplete="new-password"
          hint="Use 15 to 128 characters. Spaces and Unicode are allowed."
        />
        <PasswordField
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          error={errors.confirm}
          autoComplete="new-password"
        />
      </form>
    </Modal>
  );
}
