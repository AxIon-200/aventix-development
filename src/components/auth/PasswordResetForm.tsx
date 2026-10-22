"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthClientError, authErrorMessage, publicAuthClient, type PublicAuthClient } from "@/lib/auth/client";
import { authHref, safeReturnTo } from "@/lib/auth/destination";
import { passwordError } from "@/lib/auth/validation";
import FormField, { submitClass } from "./FormField";
import { useEmailLinkToken } from "./useEmailLinkToken";

type State = "success" | "invalid" | "uncertain";

export default function PasswordResetForm({ returnTo, client = publicAuthClient }: { returnTo?: string; client?: PublicAuthClient }) {
  const router = useRouter();
  const [state, setState] = useState<State>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const destination = safeReturnTo(returnTo);
  const clearOutcome = useCallback(() => { setMessage(""); setErrors({}); setState(undefined); }, []);
  const emailToken = useEmailLinkToken(destination, clearOutcome);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || emailToken.status !== "ready" || !emailToken.token) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword") ?? "");
    const next: Record<string, string> = {};
    const invalid = passwordError(newPassword);
    if (invalid) next.newPassword = invalid;
    if (newPassword !== String(data.get("confirmPassword") ?? "")) next.confirmPassword = "Passwords must match.";
    setMessage(""); setErrors(next);
    if (Object.keys(next).length) {
      form.querySelector<HTMLInputElement>(`[name="${Object.keys(next)[0]}"]`)?.focus();
      return;
    }
    submitting.current = true; setBusy(true);
    try {
      if (!client.resetPassword) throw new AuthClientError("UNAVAILABLE");
      await client.resetPassword({ token: emailToken.token, newPassword });
      emailToken.clear();
      setState("success");
      router.refresh();
    } catch (error) {
      if (error instanceof AuthClientError && error.code === "LINK_INVALID_OR_EXPIRED") { emailToken.clear(); setState("invalid"); }
      else if (!(error instanceof AuthClientError) || ["REQUEST_UNCERTAIN", "INVALID_RESPONSE"].includes(error.code)) {
        emailToken.clear(); setState("uncertain");
      } else setMessage(authErrorMessage(error));
    } finally {
      form.reset();
      submitting.current = false; setBusy(false);
    }
  }

  return <>
    <h1 className="text-center text-2xl font-semibold">Reset your password</h1>
    <p className="mt-3 text-sm leading-6 text-[#9fa3a8]">Opening this page does not change a password. Submit a different password for the account that received the email. Success signs that account out on every device and signs this browser out, with no replacement session. If this browser belongs to another account, its other devices stay signed in. You must log in separately.</p>
    <p className="mt-3 text-sm leading-6 text-[#9fa3a8]">Reset preserves your account role, status, email verification, and terms acceptance. Disabled or unverified accounts remain restricted. A still-valid verification email can be reopened with your new password.</p>
    <div className="mt-6 space-y-4">
      {emailToken.status === "loading" && <p role="status">Opening your email link…</p>}
      {emailToken.status === "missing" && !state && <p role="status">Reopen the link in your email to reset your password. The token is kept only in this page’s memory and removed from the address bar. Reloading requires reopening the original email link.</p>}
      {state === "invalid" && <p role="alert">Link is invalid or expired. Request a new recovery link to continue.</p>}
      {state === "success" && <p role="status" className="text-[#66fcf1]">Your password has been reset. Every session of the reset account was revoked, and this browser was signed out. No new session was created. Log in separately to continue.</p>}
      {state === "uncertain" && <p role="alert">We could not confirm the password reset. It may have completed and signed this browser out. Try logging in separately with your new password or request a new recovery link. This request has not been submitted again.</p>}
      {emailToken.status === "ready" && !state && <form onSubmit={submit} noValidate aria-busy={busy} className="space-y-4">
        <FormField name="newPassword" label="New Password" type="password" autoComplete="new-password" error={errors.newPassword} required disabled={busy} hint="Use 15–128 Unicode characters, including spaces, exactly as entered. Reloading requires reopening the original email." />
        <FormField name="confirmPassword" label="Confirm Password" type="password" autoComplete="new-password" error={errors.confirmPassword} required disabled={busy} />
        {message && <p role="alert" className="text-sm text-red-200">{message}</p>}
        <button type="submit" disabled={busy || !client.resetPassword} className={submitClass}>{busy ? "Please wait…" : "Reset password"}</button>
      </form>}
      <Link className="block text-[#66fcf1] underline" href={authHref("/login", destination)}>Log in separately</Link>
      <Link className="block text-[#66fcf1] underline" href={authHref("/forgot-password", destination)}>Request a new recovery link</Link>
    </div>
  </>;
}
