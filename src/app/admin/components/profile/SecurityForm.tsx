"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { ChangePasswordPayload } from "@/app/admin/types/profile";
import { ProfileError } from "@/app/admin/services/profileService";
import { isStrongPassword } from "@/app/admin/lib/passwordStrength";
import { FormField } from "@/app/admin/components/ui/FormField";
import { PasswordInput } from "@/app/admin/components/ui/PasswordInput";
import { PasswordStrength } from "@/app/admin/components/profile/PasswordStrength";

type Field = "currentPassword" | "newPassword" | "confirmPassword";
type Errors = Partial<Record<Field, string>>;

type Props = {
  // Should throw on failure. A ProfileError with a `field` is shown under that input.
  onChangePassword: (values: ChangePasswordPayload) => Promise<void>;
};

export function SecurityForm({ onChangePassword }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function clientErrors(): Errors {
    const e: Errors = {};
    if (!current) e.currentPassword = "Enter your current password.";
    if (!isStrongPassword(next)) e.newPassword = "Use at least 8 characters with letters, numbers, and symbols.";
    else if (next === current) e.newPassword = "New password must be different from your current password.";
    if (confirm !== next) e.confirmPassword = "Passwords don't match.";
    return e;
  }

  const errors = clientErrors();
  // The mismatch error appears as soon as they start typing the confirmation.
  const showConfirmError = Boolean(confirm) && errors.confirmPassword;
  const errorFor = (field: Field) =>
    serverErrors[field] ??
    (field === "confirmPassword"
      ? showConfirmError || submitted
        ? errors.confirmPassword
        : undefined
      : submitted
      ? errors[field]
      : undefined);

  function edit(field: Field, value: string) {
    if (field === "currentPassword") setCurrent(value);
    if (field === "newPassword") setNext(value);
    if (field === "confirmPassword") setConfirm(value);
    setServerErrors((s) => ({ ...s, [field]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    setFormError(null);
    try {
      await onChangePassword({ currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setSubmitted(false);
      setServerErrors({});
    } catch (err) {
      if (err instanceof ProfileError && err.field && ["currentPassword", "newPassword"].includes(err.field)) {
        setServerErrors({ [err.field]: err.message });
      } else {
        setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-base font-semibold text-white">Security</h2>
      <p className="mt-1 text-xs text-slate-500">Keep your administrator account protected with a strong password.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-5">
        <div className="grid gap-4 md:grid-cols-3">
          <FormField id="current-password" label="Current password" error={errorFor("currentPassword")}>
            {(a11y) => (
              <PasswordInput
                {...a11y}
                value={current}
                onChange={(e) => edit("currentPassword", e.target.value)}
                autoComplete="current-password"
                disabled={isSaving}
              />
            )}
          </FormField>

          <FormField
            id="new-password"
            label="New password"
            error={errorFor("newPassword")}
            footer={<PasswordStrength password={next} />}
          >
            {(a11y) => (
              <PasswordInput
                {...a11y}
                value={next}
                onChange={(e) => edit("newPassword", e.target.value)}
                autoComplete="new-password"
                disabled={isSaving}
              />
            )}
          </FormField>

          <FormField id="confirm-password" label="Confirm new password" error={errorFor("confirmPassword")}>
            {(a11y) => (
              <PasswordInput
                {...a11y}
                value={confirm}
                onChange={(e) => edit("confirmPassword", e.target.value)}
                autoComplete="new-password"
                disabled={isSaving}
              />
            )}
          </FormField>
        </div>

        {formError && (
          <p role="alert" className="mt-4 rounded-lg border border-rose-400/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-300">
            {formError}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Password should contain at least 8 characters and a mix of letters, numbers, and symbols.
          </p>
          <button
            type="submit"
            disabled={isSaving || !current || !next || !confirm}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Change password
          </button>
        </div>
      </form>
    </section>
  );
}
