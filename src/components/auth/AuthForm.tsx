"use client";
import styles from "./AuthShell.module.css";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FormField, { submitClass } from "./FormField";
import { AuthClientError, authErrorMessage, publicAuthClient, type PublicAuthClient, type AuthResult } from "@/lib/auth/client";
import { validEmail } from "@/lib/auth/validation";
import { authHref, safeReturnTo } from "@/lib/auth/destination";
import AccountGate from "./AccountGate";

type Mode = "login" | "forgot";
const titles: Record<Mode, [string, string]> = {
  login: ["Welcome back", "Log in to continue to Aventix."],
  forgot: ["Forgot your password?", "Enter your email to request a recovery link."],
};

export default function AuthForm({ mode, returnTo, client = publicAuthClient }: { mode: Mode; returnTo?: string; client?: PublicAuthClient }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [gate, setGate] = useState<import("@/lib/auth/client").AuthErrorCode>();
  const [uncertain, setUncertain] = useState(false);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const destination = safeReturnTo(returnTo);
  const configured = mode === "login" ? !!client.login : !!client.requestPasswordReset;

  const connected = configured;

  function navigate(result: AuthResult) {
    const target = result.allowBookingReturn && destination ? destination : result.destination ?? "/events";
    const parsed = new URL(target, window.location.origin);
    if (!target.startsWith("/") || target.startsWith("//") || /[\\\x00-\x1f]/.test(decodeURIComponent(target)) || parsed.origin !== window.location.origin) throw new Error("Invalid destination");
    router.replace(parsed.pathname + parsed.search);
    router.refresh();
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const get = (name: string) => String(data.get(name) ?? "");
    const next: Record<string, string> = {};
    setMessage("");
    setGate(undefined);
    setUncertain(false);
    if (!validEmail(get("email"))) next.email = "Enter a valid email address.";
    if (mode === "login" && !get("password")) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length) {
      const first = form.querySelector<HTMLElement>(Object.keys(next).map(name => `[name="${name}"]`).join(","));
      if (first instanceof HTMLElement) first.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      if (configured && !connected) throw new AuthClientError("UNAVAILABLE");
      if (mode === "login") {
        if (!client.login) throw new AuthClientError("UNAVAILABLE");
        const result = await client.login({ email: get("email").trim().toLowerCase(), password: get("password") });
        navigate(result);
      } else if (mode === "forgot") {
        if (!client.requestPasswordReset) throw new AuthClientError("UNAVAILABLE");
        await client.requestPasswordReset({ email: get("email").trim() });
        form.reset();
        setSuccess(true);
        setMessage("If an account exists for this address, a password-reset email will be sent.");
      }
    } catch (error) {
      setMessage(authErrorMessage(error));
      if (error instanceof AuthClientError) {
        setErrors(error.fieldErrors);
        setUncertain(error.code === "REQUEST_UNCERTAIN" || error.code === "INVALID_RESPONSE");
        if (["ACCOUNT_DISABLED", "EMAIL_VERIFICATION_REQUIRED", "TERMS_ACCEPTANCE_REQUIRED", "PASSWORD_RESET_REQUIRED"].includes(error.code)) { setGate(error.code); setMessage(""); }
      }
    } finally { submitting.current = false; setBusy(false); }
  }

  return <>
    <h1 className={`text-center font-semibold leading-tight ${mode === "login" ? "text-[26px]" : "text-2xl"}`}>{titles[mode][0]}</h1>
    <p className="mt-2 text-center text-sm text-[#9fa3a8]">{titles[mode][1]}</p>
    {destination && <p className="mt-4 rounded-lg bg-[#66fcf1]/10 p-3 text-xs text-[#66fcf1]">Your event is saved in this link. Sign in to continue when booking is available.</p>}
    {!connected && <div className={`${styles.notice} rounded-lg border border-amber-400/25 bg-amber-400/5 text-xs leading-5 text-amber-200`}>
      <p role="status">This account service is not available yet. No details will be submitted.</p>
    </div>}
    {process.env.NODE_ENV === "development" && <p className="mt-3 text-center text-xs text-[#9fa3a8]"><Link href="/preview/booking" className="text-[#66fcf1] underline">Preview booking screens with sample data</Link></p>}
    {success ? <div className="mt-8 space-y-6"><p role="status" className="text-sm leading-6 text-[#66fcf1]">{message}</p><Link href={authHref("/login", destination)} className={submitClass}>Return to Login</Link></div> : <form onSubmit={submit} noValidate aria-busy={busy} className={styles.form}>
      <FormField name="email" label="Email Address" type="email" autoComplete="email" placeholder="Enter your email" maxLength={254} error={errors.email} disabled={busy} required />
      {mode === "login" && <FormField name="password" label="Password" type="password" autoComplete="current-password" placeholder="Enter your password" error={errors.password} disabled={busy} required />}
      {mode === "login" && <div className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-[#c5c6c7]">Sessions last seven days from sign-in.</span>
        <Link className="text-[#66fcf1]" href={authHref("/forgot-password", destination)}>Forgot password?</Link>
      </div></div>}
      {message && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/5 p-3 text-sm text-red-200">{message}</p>}
      {gate && <AccountGate code={gate} returnTo={destination} />}
      {uncertain && mode === "forgot" && <p role="alert">We could not confirm the recovery request. Check your inbox and spam folder. You can explicitly request another link or log in separately; delivery has not been confirmed.</p>}
      {uncertain && mode === "login" && <button type="button" className="text-[#66fcf1] underline" onClick={() => window.dispatchEvent(new Event("aventix:session-updated"))}>Check current account</button>}
      <button type="submit" disabled={busy || !configured} className={submitClass}>{busy ? "Please wait…" : mode === "login" ? "Login" : "Request recovery link"}</button>
    </form>}
    {!success && <p className={`${styles.footer} text-center text-[13px] text-[#9fa3a8]`}>{mode === "login" ? <>New to Aventix? <Link className="hover:text-[#66fcf1]" href={authHref("/register", destination)}>Create an account</Link></> : <>Back to <Link className="hover:text-[#66fcf1]" href={authHref("/login", destination)}>Log in</Link></>}</p>}
  </>;
}
