"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthClientError, authErrorMessage, publicAuthClient, type AuthErrorCode, type CurrentTerms, type PublicAuthClient } from "@/lib/auth/client";
import { authHref, safeReturnTo } from "@/lib/auth/destination";
import { validEmail } from "@/lib/auth/validation";
import AccountGate from "./AccountGate";
import FormField, { submitClass } from "./FormField";
import styles from "./AuthShell.module.css";

type Outcome = "accepted" | "uncertain" | "recovery";

export default function TermsAcceptanceForm({ returnTo, initialEmail, client = publicAuthClient }:
  { returnTo?: string; initialEmail?: string; client?: PublicAuthClient }) {
  const destination = safeReturnTo(returnTo);
  const [terms, setTerms] = useState<CurrentTerms>();
  const [termsLoading, setTermsLoading] = useState(true);
  const [termsMessage, setTermsMessage] = useState("");
  const [termsRevision, setTermsRevision] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [gate, setGate] = useState<AuthErrorCode>();
  const [outcome, setOutcome] = useState<Outcome>();
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  function loadTerms() {
    setAccepted(false);
    setTerms(undefined);
    setTermsLoading(true);
    setTermsMessage("");
    setTermsRevision(revision => revision + 1);
  }

  useEffect(() => {
    let active = true;
    async function readTerms() {
      try {
        if (!client.getTerms) throw new AuthClientError("UNAVAILABLE");
        const current = await client.getTerms();
        if (active) setTerms(current);
      } catch (error) {
        if (active) setTermsMessage(`Current terms could not be loaded. Acceptance is unavailable. ${authErrorMessage(error)}`);
      } finally {
        if (active) setTermsLoading(false);
      }
    }
    void readTerms();
    return () => { active = false; };
  }, [client, termsRevision]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || outcome || !terms || termsLoading) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const currentPassword = String(data.get("currentPassword") ?? "");
    const next: Record<string, string> = {};
    if (email.length > 254 || !validEmail(email)) next.email = "Enter a valid email address.";
    if (!currentPassword || !currentPassword.isWellFormed() || [...currentPassword].length > 128) next.currentPassword = "Enter your current password using 1–128 Unicode characters.";
    if (!accepted || data.get("terms") !== "on") next.terms = "Read and explicitly accept the current terms.";
    setErrors(next);
    setMessage("");
    setGate(undefined);
    if (Object.keys(next).length) {
      form.querySelector<HTMLElement>(Object.keys(next).map(name => `[name="${name}"]`).join(","))?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      if (!client.acceptTerms) throw new AuthClientError("UNAVAILABLE");
      await client.acceptTerms({ email, currentPassword, termsAccepted: true, termsVersion: terms.version });
      form.reset();
      setAccepted(false);
      setOutcome("accepted");
    } catch (error) {
      if (error instanceof AuthClientError && error.code === "TERMS_VERSION_OUTDATED") {
        setMessage(authErrorMessage(error));
        loadTerms();
      } else if (error instanceof AuthClientError && error.code === "PASSWORD_RESET_REQUIRED") {
        setOutcome("recovery");
      } else if (!(error instanceof AuthClientError) || (error instanceof AuthClientError && ["REQUEST_UNCERTAIN", "INVALID_RESPONSE"].includes(error.code))) {
        setOutcome("uncertain");
      } else if (error instanceof AuthClientError) {
        setErrors(error.fieldErrors);
        if (["ACCOUNT_DISABLED", "EMAIL_VERIFICATION_REQUIRED"].includes(error.code)) setGate(error.code);
        else setMessage(authErrorMessage(error));
      }
    } finally {
      const passwordInput = form.elements.namedItem("currentPassword");
      if (passwordInput instanceof HTMLInputElement) passwordInput.value = "";
      submitting.current = false;
      setBusy(false);
    }
  }

  return <>
    <h1 className="text-center text-2xl font-semibold leading-tight">Accept current terms</h1>
    <p className="mt-3 text-sm leading-6 text-[#9fa3a8]">Use the email and current password for the account that needs consent. Acceptance never signs you in or changes an account already signed in.</p>
    {destination && <p className="mt-4 text-xs text-[#66fcf1]">Your booking return link stays in this browser flow. A new email tab or device may not have it.</p>}
    {outcome ? <div className="mt-8 space-y-5">
      {outcome === "accepted" && <p role="status" className="text-sm leading-6 text-[#66fcf1]">This account has terms acceptance on record. You have not been signed in. Log in separately with this account to continue. Any other account already signed in stays unchanged.</p>}
      {outcome === "recovery" && <p role="alert" className="text-sm leading-6 text-amber-200">This account needs a password reset before consent can be recorded. Use account recovery, then return here and enter the new current password. Your terms have not been accepted by this request.</p>}
      {outcome === "uncertain" && <p role="alert" className="text-sm leading-6 text-amber-200">We could not confirm whether consent was recorded. It may have completed. Try logging in separately or recover your password if needed. Acceptance has not been submitted again.</p>}
      <Link className={submitClass} href={authHref("/login", destination)}>Log in separately</Link>
      <Link className="block text-[#66fcf1] underline" href={authHref("/forgot-password", destination)}>Recover your password</Link>
      {outcome === "recovery" && <button type="button" onClick={() => { setOutcome(undefined); loadTerms(); }} className="text-[#66fcf1] underline">Return to current terms</button>}
    </div> : <form onSubmit={submit} noValidate aria-busy={busy} className={styles.form}>
      <fieldset disabled={busy} className="contents">
        <FormField name="email" label="Email Address" type="email" autoComplete="email" defaultValue={initialEmail} error={errors.email} required />
        <FormField name="currentPassword" label="Current password" type="password" autoComplete="current-password" hint="Enter it again here. Your password is kept exactly as entered and is never carried from login or recovery." error={errors.currentPassword} required />
        <div aria-live="polite">
          {termsLoading ? <p role="status" className="text-sm">Loading current terms…</p> : terms ? <>
            <label className="flex items-start gap-2 text-xs leading-5 text-[#c5c6c7]">
              <input name="terms" type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} required aria-invalid={!!errors.terms} aria-describedby={errors.terms ? "terms-error" : undefined} className="mt-1 h-4 w-4 shrink-0 accent-[#66fcf1]" />
              <span>I explicitly accept the <a href={terms.documentUrl} target="_blank" rel="noopener noreferrer" className="text-[#66fcf1] underline">current terms (version {terms.version})</a>.</span>
            </label>
            {errors.terms && <p id="terms-error" className="mt-2 text-xs text-red-300">{errors.terms}</p>}
          </> : <div role="alert" className="space-y-3 text-sm text-amber-200">
            <p>{termsMessage}</p>
            <button type="button" onClick={loadTerms} className="text-[#66fcf1] underline">Retry current terms</button>
          </div>}
        </div>
        {gate && <AccountGate code={gate} returnTo={destination} />}
        {message && <p role="alert" className="rounded-lg border border-red-400/30 p-3 text-sm text-red-200">{message}</p>}
        <button type="submit" disabled={busy || !terms || termsLoading || !accepted || !client.acceptTerms} className={submitClass}>{busy ? "Please wait…" : "Accept current terms"}</button>
      </fieldset>
    </form>}
    {!outcome && <p className={`${styles.footer} text-center text-[13px] text-[#9fa3a8]`}>You can also <Link className="text-[#66fcf1]" href={authHref("/login", destination)}>log in</Link>, <Link className="text-[#66fcf1]" href={authHref("/forgot-password", destination)}>recover your password</Link>, or <Link className="text-[#66fcf1]" href={authHref("/verify-email", destination)}>verify your email</Link> independently.</p>}
  </>;
}
