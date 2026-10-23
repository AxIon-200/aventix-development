"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthClientError, authErrorMessage, publicAuthClient, type PublicAuthClient } from "@/lib/auth/client";
import { authHref, safeReturnTo } from "@/lib/auth/destination";
import FormField, { submitClass } from "./FormField";
import VerificationResendForm from "./VerificationResendForm";
import { useEmailLinkToken } from "./useEmailLinkToken";

type State = "verified" | "invalid" | "recovery" | "uncertain";

export default function VerificationForm({ returnTo, client = publicAuthClient }: { returnTo?: string; client?: PublicAuthClient }) {
  const [state, setState] = useState<State>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const destination = safeReturnTo(returnTo);
  const clearOutcome = useCallback(() => { setMessage(""); setState(undefined); }, []);
  const emailToken = useEmailLinkToken(destination, clearOutcome);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || emailToken.status !== "ready" || !emailToken.token) return;
    const form = event.currentTarget;
    const currentPassword = String(new FormData(form).get("currentPassword") ?? "");
    setMessage("");
    if (!currentPassword || !currentPassword.isWellFormed() || [...currentPassword].length > 128) {
      setMessage("Enter your current password using 1–128 Unicode characters.");
      form.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }
    submitting.current = true; setBusy(true);
    try {
      if (!client.verifyEmail) throw new AuthClientError("UNAVAILABLE");
      await client.verifyEmail({ token: emailToken.token, currentPassword });
      emailToken.clear();
      setState("verified");
    } catch (error) {
      if (error instanceof AuthClientError && error.code === "LINK_INVALID_OR_EXPIRED") { emailToken.clear(); setState("invalid"); }
      else if (error instanceof AuthClientError && error.code === "PASSWORD_RESET_REQUIRED") setState("recovery");
      else if (!(error instanceof AuthClientError) || ["REQUEST_UNCERTAIN", "INVALID_RESPONSE"].includes(error.code)) setState("uncertain");
      else setMessage(authErrorMessage(error));
    } finally {
      // Credentials never travel to recovery, login, resend, history, or storage.
      form.reset();
      submitting.current = false; setBusy(false);
    }
  }

  return <>
    <h1 className="text-center text-2xl font-semibold">Verify your email</h1>
    <p className="mt-3 text-sm leading-6 text-[#9fa3a8]">Opening this page does not verify your email. Submit the current password for the account that received the email. Verification never signs you in or changes your signed-in identity.</p>
    <div className="mt-6 space-y-4">
      {emailToken.status === "loading" && <p role="status">Opening your email link…</p>}
      {emailToken.status === "missing" && !state && <p role="status">Reopen the link in your email to verify. The token is kept only in this page’s memory and removed from the address bar. Reloading requires reopening the email link.</p>}
      {state === "invalid" && <p role="alert">Link is invalid or expired. Request another verification email or recover your password.</p>}
      {state === "verified" && <p role="status" className="text-[#66fcf1]">Your email has been verified. You have not been signed in. Log in separately to continue. Any account already signed in stays unchanged.</p>}
      {state === "recovery" && <p role="alert">Reset your password through account recovery before verifying. After recovery, reopen a still-valid verification email and submit your new current password. Your email has not been verified by this request.</p>}
      {state === "uncertain" && <p role="alert">We could not confirm verification. It may have completed. Try logging in separately, request another verification email, or recover your password. This request has not been submitted again.</p>}
      {emailToken.status === "ready" && !state && <form onSubmit={submit} noValidate aria-busy={busy} className="space-y-4">
        <FormField name="currentPassword" label="Current password" type="password" autoComplete="current-password" required disabled={busy} hint="Use the password for the account that received this link. Reloading requires reopening the email." />
        {message && <p role="alert" className="text-sm text-red-200">{message}</p>}
        <button type="submit" disabled={busy || !client.verifyEmail} className={submitClass}>{busy ? "Please wait…" : "Verify email"}</button>
      </form>}
      <Link className="block text-[#66fcf1] underline" href={authHref("/login", destination)}>Log in separately</Link>
      <Link className="block text-[#66fcf1] underline" href={authHref("/forgot-password", destination)}>Recover your password</Link>
    </div>
    {emailToken.status !== "loading" && state !== "verified" && <VerificationResendForm client={client} />}
  </>;
}
