"use client";

import { useRef, useState, type FormEvent } from "react";
import { AuthClientError, authErrorMessage, publicAuthClient, type PublicAuthClient } from "@/lib/auth/client";
import { validEmail } from "@/lib/auth/validation";
import FormField, { submitClass } from "./FormField";

export default function VerificationResendForm({ client = publicAuthClient }: { client?: PublicAuthClient }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const email = String(new FormData(form).get("resendEmail") ?? "");
    setError(""); setMessage("");
    if (!validEmail(email)) {
      setError("Enter a valid email address.");
      form.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }
    submitting.current = true; setBusy(true);
    try {
      if (!client.resendVerification) throw new AuthClientError("UNAVAILABLE");
      await client.resendVerification({ email });
      setMessage("If this address is eligible, a verification email will be sent.");
    } catch (error) {
      setError(error instanceof AuthClientError && ["REQUEST_UNCERTAIN", "INVALID_RESPONSE"].includes(error.code)
        ? "We could not confirm the resend request. It may have reached the server. Check your inbox and spam folder before explicitly requesting another link."
        : authErrorMessage(error));
    } finally { submitting.current = false; setBusy(false); }
  }

  return <section className="mt-8 border-t border-[#2c3644] pt-6" aria-labelledby="resend-heading">
    <h2 id="resend-heading" className="text-lg font-semibold">Request another verification email</h2>
    <p className="mt-2 text-sm leading-6 text-[#9fa3a8]">Check your inbox and spam folder. Delivery attempts are limited to one per address every 60 seconds. Requesting a link keeps earlier links usable until they expire or verification succeeds.</p>
    <form onSubmit={submit} noValidate aria-busy={busy} className="mt-5 space-y-4">
      <FormField name="resendEmail" label="Email for verification" type="email" autoComplete="email" required disabled={busy} />
      {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
      {message && <p role="status" className="text-sm text-[#66fcf1]">{message}</p>}
      <button type="submit" disabled={busy || !client.resendVerification} className={submitClass}>{busy ? "Please wait…" : "Request verification email"}</button>
    </form>
  </section>;
}
