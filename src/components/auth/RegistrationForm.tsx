"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthClientError, authErrorMessage, publicAuthClient, type CurrentTerms, type PublicAuthClient } from "@/lib/auth/client";
import { attendeePayload, nameError, validPhone, passwordError, validEmail } from "@/lib/auth/validation";
import { authHref, safeReturnTo } from "@/lib/auth/destination";
import FormField, { submitClass } from "./FormField";
import styles from "./AuthShell.module.css";

type Outcome = "created" | "delivery-failed" | "duplicate" | "uncertain";

export default function RegistrationForm({ returnTo, client = publicAuthClient }: { returnTo?: string; client?: PublicAuthClient }) {
  const destination = safeReturnTo(returnTo);
  const [terms, setTerms] = useState<CurrentTerms>();
  const [termsLoading, setTermsLoading] = useState(true);
  const [termsMessage, setTermsMessage] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [outcome, setOutcome] = useState<Outcome>();
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [termsRevision, setTermsRevision] = useState(0);

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
        if (active) setTermsMessage(`Current terms could not be loaded. Registration is unavailable. ${authErrorMessage(error)}`);
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
    const get = (name: string) => String(data.get(name) ?? "");
    const next: Record<string, string> = {};
    for (const field of ["firstName", "lastName"]) {
      const error = nameError(get(field));
      if (error) next[field] = error;
    }
    if (!validEmail(get("email"))) next.email = "Enter a valid email address.";
    if (get("phoneNumber") !== "" && !validPhone(get("phoneNumber"))) next.phoneNumber = "Use 09 plus nine digits or +639 plus nine digits, without spaces or hyphens.";
    const invalidPassword = passwordError(get("password"));
    if (invalidPassword) next.password = invalidPassword;
    if (get("password") !== get("confirmPassword")) next.confirmPassword = "Passwords must match.";
    if (!accepted || get("terms") !== "on") next.terms = "Read and explicitly accept the current terms.";
    setErrors(next);
    setMessage("");
    if (Object.keys(next).length) {
      form.querySelector<HTMLElement>(Object.keys(next).map(name => `[name="${name}"]`).join(","))?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      if (!client.registerAttendee) throw new AuthClientError("UNAVAILABLE");
      await client.registerAttendee(attendeePayload(data, terms.version));
      form.reset();
      setOutcome("created");
    } catch (error) {
      if (error instanceof AuthClientError) {
        if (error.code === "TERMS_VERSION_OUTDATED") {
          // Preserve contact/name inputs, clear credentials and require fresh consent.
          for (const name of ["password", "confirmPassword"]) {
            const input = form.elements.namedItem(name);
            if (input instanceof HTMLInputElement) input.value = "";
          }
          setMessage(authErrorMessage(error));
          loadTerms();
        } else if (error.code === "ACCOUNT_CREATED_EMAIL_FAILED" || error.code === "EMAIL_ALREADY_REGISTERED"
          || error.code === "REQUEST_UNCERTAIN" || error.code === "INVALID_RESPONSE") {
          form.reset();
          setOutcome(error.code === "ACCOUNT_CREATED_EMAIL_FAILED" ? "delivery-failed" : error.code === "EMAIL_ALREADY_REGISTERED" ? "duplicate" : "uncertain");
        } else {
          setErrors(error.fieldErrors);
          setMessage(authErrorMessage(error));
        }
      } else {
        form.reset();
        setOutcome("uncertain");
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <>
    <Link className="mb-4 inline-block text-xs text-[#66fcf1]" href={authHref("/register", destination)}>← Back</Link>
    <h1 className="text-center text-2xl font-semibold leading-tight">Create your Attendee Account</h1>
    <p className="mt-2 text-center text-sm text-[#9fa3a8]">Register, verify your email, then log in separately to book tickets.</p>
    {destination && <p className="mt-4 text-xs text-[#66fcf1]">Your booking return link stays in this browser flow. A new email tab or device may not have it.</p>}
    {outcome ? <div className="mt-8 space-y-5">
      <p role="status" className="text-sm leading-6 text-[#66fcf1]">{
        outcome === "created" ? "Your unverified attendee account has been created. Check your inbox and spam folder for the verification email. Open its link and submit your current password to verify, then log in separately. You have not been signed in."
          : outcome === "delivery-failed" ? authErrorMessage(new AuthClientError("ACCOUNT_CREATED_EMAIL_FAILED"))
          : outcome === "duplicate" ? authErrorMessage(new AuthClientError("EMAIL_ALREADY_REGISTERED"))
          : "We could not confirm registration. Your account may have been created. Try logging in, recovering your password, or requesting another verification email. Registration has not been submitted again."
      }</p>
      {(outcome === "created" || outcome === "delivery-failed" || outcome === "uncertain") && <Link className="block text-[#66fcf1] underline" href={authHref("/verify-email", destination)}>Request another verification email</Link>}
      <Link className={submitClass} href={authHref("/login", destination)}>Log in separately</Link>
      {(outcome === "duplicate" || outcome === "uncertain") && <Link className="block text-[#66fcf1] underline" href={authHref("/forgot-password", destination)}>Recover your password</Link>}
    </div> : <form onSubmit={submit} noValidate aria-busy={busy} className={`${styles.form} ${styles.registration}`}>
      <fieldset disabled={busy} className="contents">
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          <FormField name="firstName" label="First Name" autoComplete="given-name" error={errors.firstName} required />
          <FormField name="lastName" label="Last Name" autoComplete="family-name" error={errors.lastName} required />
        </div>
        <FormField name="email" label="Email Address" type="email" autoComplete="email" error={errors.email} required />
        <FormField name="phoneNumber" label="Phone / Contact Number (optional)" type="tel" autoComplete="tel" placeholder="09171234567" error={errors.phoneNumber} />
        <FormField name="password" label="Password" type="password" autoComplete="new-password" hint="Use 15–128 Unicode characters, including spaces. Your password is kept exactly as entered." error={errors.password} required />
        <FormField name="confirmPassword" label="Confirm Password" type="password" autoComplete="new-password" error={errors.confirmPassword} required />
        <div className="sm:col-span-2" aria-live="polite">
          {termsLoading ? <p role="status" className="text-sm">Loading current terms…</p> : terms ? <>
            <label className="flex items-start gap-2 text-xs leading-5 text-[#c5c6c7]">
              <input name="terms" type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} required aria-invalid={!!errors.terms} aria-describedby={errors.terms ? "terms-error" : undefined} className="mt-1 h-4 w-4 shrink-0 accent-[#66fcf1]" />
              <span>I explicitly accept the <a href={terms.documentUrl} target="_blank" rel="noopener noreferrer" className="text-[#66fcf1] underline">current terms (version {terms.version})</a>.</span>
            </label>
            {errors.terms && <p id="terms-error" className="mt-2 text-xs text-red-300">{errors.terms}</p>}
          </> : <div role="alert" className="space-y-3 text-sm text-amber-200">
            <p>{termsMessage}</p>
            <button type="button" onClick={() => void loadTerms()} className="text-[#66fcf1] underline">Retry current terms</button>
          </div>}
        </div>
        {message && <p role="alert" className="sm:col-span-2 rounded-lg border border-red-400/30 p-3 text-sm text-red-200">{message}</p>}
        <button type="submit" disabled={busy || !terms || termsLoading || !accepted || !client.registerAttendee} className={`${submitClass} sm:col-span-2`}>{busy ? "Please wait…" : "Register"}</button>
      </fieldset>
    </form>}
    {!outcome && <p className={`${styles.footer} text-center text-[13px] text-[#9fa3a8]`}>Already have an account? <Link className="text-[#66fcf1]" href={authHref("/login", destination)}>Log in</Link> · <Link className="text-[#66fcf1]" href={authHref("/forgot-password", destination)}>Recover your password</Link> · <Link className="text-[#66fcf1]" href={authHref("/verify-email", destination)}>Email verification</Link></p>}
  </>;
}
