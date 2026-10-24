"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthClientError, authErrorMessage, publicAuthClient, type CurrentTerms, type PublicAuthClient } from "@/lib/auth/client";
import { nameError, passwordError, validEmail, validPhone } from "@/lib/auth/validation";
import { authHref, safeReturnTo } from "@/lib/auth/destination";
import FormField, { fieldClass, submitClass } from "./FormField";
import styles from "./AuthShell.module.css";

type Outcome = "created" | "delivery-failed" | "duplicate" | "uncertain";
const organizerTermsVersion = "aventix-prototype-2026-10-24-v2";
const invalidText = (value: string, min: number, max: number) => {
  const trimmed = value.trim();
  return !trimmed.isWellFormed() || trimmed.includes("\u0000") || [...trimmed].length < min || [...trimmed].length > max;
};

export default function OrganizerApplicationForm({ returnTo, client = publicAuthClient }: { returnTo?: string; client?: PublicAuthClient }) {
  const destination = safeReturnTo(returnTo);
  const [terms, setTerms] = useState<CurrentTerms>();
  const [termsLoading, setTermsLoading] = useState(true);
  const [termsMessage, setTermsMessage] = useState("");
  const [termsRevision, setTermsRevision] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [outcome, setOutcome] = useState<Outcome>();
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const organizerTermsReady = terms?.version === organizerTermsVersion;

  function reloadTerms() {
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
        if (active) setTermsMessage(`Current terms could not be loaded. Applications are unavailable. ${authErrorMessage(error)}`);
      } finally { if (active) setTermsLoading(false); }
    }
    void readTerms();
    return () => { active = false; };
  }, [client, termsRevision]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || outcome || !terms || !organizerTermsReady || termsLoading) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const get = (name: string) => String(data.get(name) ?? "");
    const next: Record<string, string> = {};
    for (const field of ["firstName", "lastName"]) {
      const error = nameError(get(field));
      if (error) next[field] = error;
    }
    if (!validEmail(get("email"))) next.email = "Enter a valid email address.";
    if (get("phoneNumber") && !validPhone(get("phoneNumber"))) next.phoneNumber = "Use 09 plus nine digits or +639 plus nine digits, without spaces or hyphens.";
    if (invalidText(get("organizationName"), 2, 150)) next.organizationName = "Use 2–150 Unicode characters.";
    if (invalidText(get("organizationDescription"), 20, 2000)) next.organizationDescription = "Use 20–2,000 Unicode characters.";
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
    const clearPasswords = () => {
      for (const name of ["password", "confirmPassword"]) {
        const field = form.elements.namedItem(name);
        if (field instanceof HTMLInputElement) field.value = "";
      }
    };
    try {
      if (!client.registerOrganizer) throw new AuthClientError("UNAVAILABLE");
      await client.registerOrganizer({
        firstName: get("firstName"), lastName: get("lastName"), email: get("email"),
        ...(get("phoneNumber") ? { phoneNumber: get("phoneNumber") } : {}),
        organizationName: get("organizationName"), organizationDescription: get("organizationDescription"),
        password: get("password"), termsAccepted: true, termsVersion: terms.version,
      });
      clearPasswords();
      setOutcome("created");
    } catch (error) {
      if (error instanceof AuthClientError && error.code === "TERMS_VERSION_OUTDATED") {
        clearPasswords();
        setMessage(authErrorMessage(error));
        reloadTerms();
      } else if (error instanceof AuthClientError && error.code === "EMAIL_ALREADY_REGISTERED") {
        clearPasswords(); setOutcome("duplicate");
      } else if (error instanceof AuthClientError && error.code === "ACCOUNT_CREATED_EMAIL_FAILED") {
        clearPasswords(); setOutcome("delivery-failed");
      } else if (error instanceof AuthClientError && error.code === "RATE_LIMITED") {
        clearPasswords(); setMessage(authErrorMessage(error));
      } else if (error instanceof AuthClientError && error.code === "VALIDATION_ERROR") {
        setErrors(error.fieldErrors); setMessage(authErrorMessage(error));
      } else { clearPasswords(); setOutcome("uncertain"); }
    } finally { submitting.current = false; setBusy(false); }
  }

  return <>
    <Link href={authHref("/register", destination)} className="mb-4 inline-block text-xs text-[#66fcf1]">← Back</Link>
    <h1 className="text-center text-2xl font-semibold">Apply as an Organizer</h1>
    <p className="mt-2 text-center text-sm leading-6 text-[#aeb6c2]">Create a separate organizer account. Verify your email after applying; an administrator must approve your organization before you can log in.</p>
    {outcome && outcome !== "uncertain" ? <div className="mt-7 space-y-4">
      <p role="status" className="text-sm leading-6 text-[#66fcf1]">{outcome === "created"
        ? "Your organizer application was saved. Check your inbox for a verification link, open it, and enter your current password. Verification does not approve the organization or sign you in. Wait for administrator approval before logging in."
        : outcome === "delivery-failed"
          ? "Your organizer application was saved, but the verification email could not be sent. Wait at least one minute after applying, then request another verification email. Administrator approval is still required before login."
          : "This email is already registered. The existing account and application were not changed. Log in or recover your password."}</p>
      {outcome !== "duplicate" && <Link href="/verify-email" className="block text-[#66fcf1] underline">Request another verification email</Link>}
      <Link href="/forgot-password" className="block text-[#66fcf1] underline">Recover your password</Link>
      <Link href="/login" className={submitClass}>Go to login</Link>
    </div> : <>
      {outcome === "uncertain" && <div role="alert" className="mt-6 space-y-2 rounded-lg border border-amber-400/30 p-3 text-sm text-amber-200">
        <p>We could not confirm whether your application was saved. Your draft remains below, but its passwords were cleared. This request has not been submitted again.</p>
        <p>Try logging in, requesting another verification email, or recovering your password before making a new application attempt.</p>
        <Link className="block text-[#66fcf1] underline" href="/login">Go to login</Link>
        <Link className="block text-[#66fcf1] underline" href="/verify-email">Request another verification email</Link>
        <Link className="block text-[#66fcf1] underline" href="/forgot-password">Recover your password</Link>
      </div>}
      <form onSubmit={submit} noValidate aria-busy={busy} className={`${styles.form} ${styles.registration}`}>
        <fieldset disabled={busy || outcome === "uncertain"} className="contents">
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            <FormField name="firstName" label="First Name" autoComplete="given-name" error={errors.firstName} required />
            <FormField name="lastName" label="Last Name" autoComplete="family-name" error={errors.lastName} required />
          </div>
          <FormField name="email" label="Email Address" type="email" autoComplete="email" error={errors.email} required />
          <FormField name="phoneNumber" label="Philippine Mobile Number (optional)" type="tel" autoComplete="tel" placeholder="09171234567" error={errors.phoneNumber} />
          <FormField name="organizationName" label="Organization Name" hint="2–150 characters. Another organization may use the same name." error={errors.organizationName} required />
          <label className="block text-[13px] font-semibold text-[#c5c6c7] sm:col-span-2">Organization Description
            <textarea name="organizationDescription" required aria-invalid={!!errors.organizationDescription} aria-describedby={errors.organizationDescription ? "organization-description-error" : undefined}
              className={`${fieldClass} mt-2 min-h-28 py-3`} placeholder="Describe the music events you plan to organize (20–2,000 characters)." />
            {errors.organizationDescription && <span id="organization-description-error" className="mt-1 block text-xs text-red-300">{errors.organizationDescription}</span>}
          </label>
          <FormField name="password" label="Password" type="password" autoComplete="new-password" hint="15–128 Unicode characters, including spaces. Your password is kept exactly as entered." error={errors.password} required />
          <FormField name="confirmPassword" label="Confirm Password" type="password" autoComplete="new-password" error={errors.confirmPassword} required />
          <section aria-labelledby="organizer-conditions-heading" className="sm:col-span-2 rounded-lg border border-[#35404b] bg-[#181f27] p-4 text-xs leading-5 text-[#c5c6c7]">
            <h2 id="organizer-conditions-heading" className="text-sm font-semibold text-white">Concert organizer conditions</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Apply only if you are authorized to represent the organization, and provide accurate details.</li>
              <li>Obtain the necessary venue, performer, content, and safety permissions before any real event.</li>
              <li>Keep event dates, locations, lineups, prices, and changes truthful and clear.</li>
              <li>Do not sell tickets, collect payments, or promise admission through this school-project prototype.</li>
            </ul>
            <p className="mt-2">Email verification and administrator approval are separate steps. The full conditions are in the linked current terms.</p>
          </section>
          <div className="sm:col-span-2" aria-live="polite">
            {termsLoading ? <p role="status" className="text-sm">Loading current terms…</p> : terms && organizerTermsReady ? <>
              <label className="flex items-start gap-2 text-xs leading-5 text-[#c5c6c7]">
                <input name="terms" type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} required aria-invalid={!!errors.terms} className="mt-1 h-4 w-4 shrink-0 accent-[#66fcf1]" />
                <span>I explicitly accept the <a href={terms.documentUrl} target="_blank" rel="noopener noreferrer" className="text-[#66fcf1] underline">current terms, including the concert organizer conditions (version {terms.version})</a>.</span>
              </label>
              {errors.terms && <p className="mt-2 text-xs text-red-300">{errors.terms}</p>}
            </> : terms ? <p role="alert" className="text-sm text-amber-200">Organizer applications require the updated concert organizer terms. The current version is not ready yet.</p> : <div role="alert" className="space-y-2 text-sm text-amber-200">
              <p>{termsMessage}</p><button type="button" onClick={reloadTerms} className="text-[#66fcf1] underline">Retry current terms</button>
            </div>}
          </div>
          {message && <p role="alert" className="sm:col-span-2 rounded-lg border border-red-400/30 p-3 text-sm text-red-200">{message}</p>}
          <button type="submit" disabled={busy || !!outcome || !organizerTermsReady || termsLoading || !accepted || !client.registerOrganizer} className={`${submitClass} sm:col-span-2`}>{busy ? "Please wait…" : "Submit Organizer Application"}</button>
        </fieldset>
      </form>
    </>}
    <p className="mt-6 text-center text-xs text-[#aeb6c2]">Already have an account? <Link href={authHref("/login", destination)} className="text-[#66fcf1]">Log in</Link></p>
  </>;
}
