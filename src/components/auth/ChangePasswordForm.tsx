"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { authErrorMessage, AuthClientError, publicAuthClient, type AccountSession, type AuthErrorCode } from "@/lib/auth/client";
import { authHref } from "@/lib/auth/destination";
import { passwordError } from "@/lib/auth/validation";
import FormField, { submitClass } from "./FormField";

export default function ChangePasswordForm({ session, returnTo, onAccessRejected }: {
  session: AccountSession; returnTo: string;
  onAccessRejected: (code: AuthErrorCode, expectedUserId: string) => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<"confirmed" | "uncertain" | null>(null);
  const [sessionCheck, setSessionCheck] = useState<"checking" | "available" | "unavailable">("checking");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!busy) formRef.current?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus();
  }, [errors, busy]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const next: Record<string, string> = {};
    if (!currentPassword || !currentPassword.isWellFormed() || [...currentPassword].length > 128) {
      next.currentPassword = "Enter your current password using at most 128 Unicode characters.";
    }
    const issue = passwordError(newPassword);
    if (issue) next.newPassword = issue;
    if (newPassword !== String(data.get("confirmPassword") ?? "")) next.confirmPassword = "Passwords must match.";
    setErrors(next); setMessage(""); setOutcome(null);
    if (Object.keys(next).length) {
      form.querySelector<HTMLInputElement>(`[name="${Object.keys(next)[0]}"]`)?.focus();
      return;
    }
    submitting.current = true; setBusy(true);
    try {
      if (!publicAuthClient.changePassword) throw new AuthClientError("UNAVAILABLE");
      await publicAuthClient.changePassword({ currentPassword, newPassword });
      form.reset();
      setOutcome("confirmed");
    } catch (cause) {
      const error = cause instanceof AuthClientError ? cause : new AuthClientError("REQUEST_UNCERTAIN");
      if (["AUTHENTICATION_REQUIRED", "ACCOUNT_DISABLED", "EMAIL_VERIFICATION_REQUIRED",
        "TERMS_ACCEPTANCE_REQUIRED", "PASSWORD_RESET_REQUIRED"].includes(error.code)) {
        onAccessRejected(error.code, session.userId);
      } else if (["REQUEST_UNCERTAIN", "INVALID_RESPONSE", "UNAVAILABLE"].includes(error.code)) {
        form.reset();
        setOutcome("uncertain");
        setSessionCheck("checking");
        // A profile read can confirm session availability, never the stored password.
        try {
          if (!publicAuthClient.getProfile) throw new AuthClientError("UNAVAILABLE");
          const current = await publicAuthClient.getProfile();
          if (current.id !== session.userId || current.role !== session.role) throw new AuthClientError("INVALID_RESPONSE");
          setSessionCheck("available");
        } catch (readError) {
          setSessionCheck("unavailable");
          if (readError instanceof AuthClientError && ["AUTHENTICATION_REQUIRED", "ACCOUNT_DISABLED",
            "EMAIL_VERIFICATION_REQUIRED", "TERMS_ACCEPTANCE_REQUIRED", "PASSWORD_RESET_REQUIRED"].includes(readError.code)) {
            onAccessRejected(readError.code, session.userId);
          }
        }
      } else {
        const feedback = error.code === "PASSWORD_REUSE"
          ? "Choose a new password different from your current password." : authErrorMessage(error);
        setErrors(error.code === "CURRENT_PASSWORD_INCORRECT" ? { currentPassword: feedback }
          : error.code === "PASSWORD_REUSE" ? { newPassword: feedback } : error.fieldErrors);
        setMessage(feedback);
      }
    } finally {
      submitting.current = false; setBusy(false);
    }
  }

  return <section aria-labelledby="change-password-title" className="rounded-2xl border border-slate-700 bg-[#151b23] p-5 sm:p-8">
    <h2 id="change-password-title" className="text-xl font-semibold sm:text-2xl">Change password</h2>
    <p className="mt-2 text-sm text-slate-300">Enter your current password and a different new password. Passwords are used exactly as entered.</p>
    <form ref={formRef} onSubmit={submit} noValidate aria-busy={busy} className="mt-6 space-y-4">
      <fieldset disabled={busy} className="space-y-4">
        <FormField name="currentPassword" label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword} required />
        <FormField name="newPassword" label="New password" type="password" autoComplete="new-password" error={errors.newPassword} hint="Use 15–128 Unicode characters, including spaces." required />
        <FormField name="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirmPassword} required />
      </fieldset>
      {message && <p role="alert" className="text-sm text-red-200">{message}</p>}
      {outcome === "confirmed" && <p role="status" className="text-sm text-[#66fcf1]">Your password was changed. This session remains signed in until its original expiry. Other sessions and outstanding password-reset links were invalidated.</p>}
      {outcome === "uncertain" && <p role="alert" className="text-sm text-amber-200">We could not confirm whether your password changed. The request was not sent again. {sessionCheck === "checking" ? "Checking whether this session is still available." : sessionCheck === "available" ? "Your current session is still available." : "We could not check whether this session is still available."} A session check cannot show which password is stored. Try logging in with the new password, or use account recovery if needed.</p>}
      <button type="submit" disabled={busy || !publicAuthClient.changePassword} className={`${submitClass} sm:w-auto`}>{busy ? "Changing password…" : "Change password"}</button>
    </form>
    <div className="mt-5 flex flex-wrap gap-4 text-sm">
      <Link href={authHref("/forgot-password", returnTo)} className="text-[#66fcf1] underline">Forgot your current password?</Link>
      {outcome === "uncertain" && <Link href={authHref("/login", returnTo)} className="text-[#66fcf1] underline">Log in separately</Link>}
    </div>
  </section>;
}
