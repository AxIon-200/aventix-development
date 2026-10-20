"use client";
import styles from "./AuthShell.module.css";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FormField, { submitClass } from "./FormField";
import { AuthClientError, authErrorMessage, publicAuthClient, type PublicAuthClient, type AuthResult } from "@/lib/auth/client";
import { attendeePayload, normalizePhone, passwordError, validEmail } from "@/lib/auth/validation";
import { authHref, safeReturnTo } from "@/lib/auth/destination";
import AccountGate from "./AccountGate";

type Mode = "login" | "attendee" | "forgot" | "reset";
const titles: Record<Mode, [string, string]> = {
  login: ["Welcome back", "Log in to continue to Aventix."],
  attendee: ["Create your Attendee Account", "Sign up to discover events and book tickets."],
  forgot: ["Forgot your password?", "Enter your email to request a recovery link."],
  reset: ["Reset your password", "Choose a new password for your Aventix account."],
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
  const [recovery, setRecovery] = useState<"checking" | "valid" | "invalid" | "unavailable">("checking");
  const recoveryLink = useRef("");
  const destination = safeReturnTo(returnTo);
  const configured = mode === "login" ? !!client.login : mode === "attendee" ? !!client.registerAttendee : mode === "forgot" ? !!client.requestPasswordReset : !!client.resetPassword && !!client.verifyRecoveryLink;

  const connected = configured;

  function navigate(result: AuthResult) {
    const target = result.allowBookingReturn && destination ? destination : result.destination ?? "/events";
    const parsed = new URL(target, window.location.origin);
    if (!target.startsWith("/") || target.startsWith("//") || /[\\\x00-\x1f]/.test(decodeURIComponent(target)) || parsed.origin !== window.location.origin) throw new Error("Invalid destination");
    router.replace(parsed.pathname + parsed.search);
    router.refresh();
  }

  useEffect(() => {
    if (mode !== "reset") return;
    let active = true;
    recoveryLink.current = window.location.href;
    async function verify() {
      if (!client.verifyRecoveryLink) { if (active) setRecovery("unavailable"); return; }
      try {
        await client.verifyRecoveryLink(recoveryLink.current);
        if (active) setRecovery("valid");
      } catch (error) {
        if (active) { setRecovery("invalid"); setMessage(authErrorMessage(error)); }
      }
    }
    void verify();
    return () => { active = false; };
  }, [mode, client]);

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
    if (mode !== "reset" && !validEmail(get("email"))) next.email = "Enter a valid email address.";
    if (mode === "login" && !get("password")) next.password = "Enter your password.";
    if (mode === "attendee") {
      if (!get("firstName").trim()) next.firstName = "Enter your first name.";
      if (!get("lastName").trim()) next.lastName = "Enter your last name.";
      if (!normalizePhone(get("phoneNumber"))) next.phoneNumber = "Enter a valid mobile number, such as 0917 123 4567 or +63 917 123 4567.";
      if (get("terms") !== "on") next.terms = "Accept the Terms & Conditions and Privacy Policy to continue.";
    }
    if (mode === "attendee" || mode === "reset") {
      const error = (client.passwordRules?.validate ?? passwordError)(get("password"));
      if (error) next.password = error;
      if (!get("confirmPassword") || get("password") !== get("confirmPassword")) next.confirmPassword = "Passwords must match.";
    }
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
      } else if (mode === "attendee") {
        if (!client.registerAttendee) throw new AuthClientError("UNAVAILABLE");
        const result = await client.registerAttendee(attendeePayload(data));
        if (result) { navigate(result); return; }
        form.reset();
        setSuccess(true);
        setMessage("Your attendee account has been created. You can now log in.");
      } else if (mode === "forgot") {
        if (!client.requestPasswordReset) throw new AuthClientError("UNAVAILABLE");
        await client.requestPasswordReset({ email: get("email").trim() });
        form.reset();
        setSuccess(true);
        setMessage("If an eligible account exists for that email, you’ll receive a password recovery link. Check your inbox and spam folder.");
      } else {
        if (recovery !== "valid" || !client.resetPassword) throw new AuthClientError("UNAVAILABLE");
        await client.resetPassword({ recoveryLink: recoveryLink.current, password: get("password") });
        form.reset();
        recoveryLink.current = "";
        // Remove the used recovery link from this history entry.
        window.history.replaceState(null, "", "/reset-password");
        setSuccess(true);
        setMessage("Your password has been reset. Return to Login to sign in.");
      }
    } catch (error) {
      setMessage(authErrorMessage(error));
      if (error instanceof AuthClientError) {
        setErrors(error.fieldErrors);
        setUncertain(error.code === "REQUEST_UNCERTAIN" || error.code === "INVALID_RESPONSE");
        if (["ACCOUNT_DISABLED", "EMAIL_VERIFICATION_REQUIRED", "TERMS_ACCEPTANCE_REQUIRED", "PASSWORD_RESET_REQUIRED"].includes(error.code)) { setGate(error.code); setMessage(""); }
      }
      if (mode === "reset" && error instanceof AuthClientError && ["INVALID_RECOVERY_LINK", "EXPIRED_RECOVERY_LINK", "USED_RECOVERY_LINK"].includes(error.code)) setRecovery("invalid");
    } finally { submitting.current = false; setBusy(false); }
  }

  return <>
    {mode === "attendee" && <Link className="mb-4 inline-block text-xs text-[#66fcf1]" href={authHref("/register", destination)}>← Back</Link>}
    <h1 className={`text-center font-semibold leading-tight ${mode === "login" ? "text-[26px]" : "text-2xl"}`}>{titles[mode][0]}</h1>
    <p className="mt-2 text-center text-sm text-[#9fa3a8]">{titles[mode][1]}</p>
    {destination && <p className="mt-4 rounded-lg bg-[#66fcf1]/10 p-3 text-xs text-[#66fcf1]">Your event is saved in this link. Sign in to continue when booking is available.</p>}
    {!connected && <div className={`${styles.notice} rounded-lg border border-amber-400/25 bg-amber-400/5 text-xs leading-5 text-amber-200`}>
      <p role="status">{mode === "reset" ? "Password recovery is unavailable until the backend recovery service is connected." : "This account service is not available yet. No details will be submitted."}</p>
    </div>}
    {process.env.NODE_ENV === "development" && <p className="mt-3 text-center text-xs text-[#9fa3a8]"><Link href="/preview/booking" className="text-[#66fcf1] underline">Preview booking screens with sample data</Link></p>}
    {success ? <div className="mt-8 space-y-6"><p role="status" className="text-sm leading-6 text-[#66fcf1]">{message}</p><Link href={authHref("/login", destination)} className={submitClass}>Return to Login</Link></div> : <form onSubmit={submit} noValidate aria-busy={busy} className={`${styles.form} ${mode === "attendee" ? styles.registration : ""}`}>
      {mode === "attendee" && <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
        <FormField name="firstName" label="First Name" autoComplete="given-name" placeholder="Enter first name" maxLength={100} error={errors.firstName} required />
        <FormField name="lastName" label="Last Name" autoComplete="family-name" placeholder="Enter last name" maxLength={100} error={errors.lastName} required />
      </div>}
      {mode !== "reset" && <FormField name="email" label="Email Address" type="email" autoComplete="email" placeholder="Enter your email" maxLength={254} error={errors.email} required />}
      {mode === "attendee" && <FormField name="phoneNumber" label="Phone / Contact Number" type="tel" autoComplete="tel" placeholder="0917 123 4567" maxLength={25} error={errors.phoneNumber} required />}
      {mode === "reset" && recovery !== "valid" && <p role="status" className="text-sm text-[#c5c6c7]">{recovery === "checking" ? "Checking recovery link…" : recovery === "invalid" ? "Request a new recovery link to continue." : "Only a verified recovery link can unlock this form."}</p>}
      {mode !== "forgot" && <FormField name="password" label={mode === "reset" ? "New Password" : "Password"} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "login" ? "Enter your password" : "Create a password"} error={errors.password} disabled={mode === "reset" && recovery !== "valid"} hint={mode === "login" ? undefined : client.passwordRules?.description ?? "Use at least 8 characters. Final password requirements await the account service."} required />}
      {(mode === "attendee" || mode === "reset") && <FormField name="confirmPassword" label="Confirm Password" type="password" autoComplete="new-password" placeholder="Re-enter your password" error={errors.confirmPassword} disabled={mode === "reset" && recovery !== "valid"} required />}
      {mode === "login" && <div className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-[#c5c6c7]">Sessions last seven days from sign-in.</span>
        <Link className="text-[#66fcf1]" href={authHref("/forgot-password", destination)}>Forgot password?</Link>
      </div></div>}
      {mode === "attendee" && <div className="sm:col-span-2"><label className="flex items-start gap-2 text-xs leading-5 text-[#c5c6c7]"><input name="terms" type="checkbox" required aria-invalid={!!errors.terms} aria-describedby={errors.terms ? "terms-error" : undefined} className="mt-1 h-4 w-4 shrink-0 accent-[#66fcf1]" /><span>I agree to the <Link href="/legal/terms" className="text-[#66fcf1] underline" target="_blank">Terms & Conditions</Link> and <Link href="/legal/privacy" className="text-[#66fcf1] underline" target="_blank">Privacy Policy</Link>.</span></label>{errors.terms && <p id="terms-error" className="mt-2 text-xs text-red-300">{errors.terms}</p>}</div>}
      {message && <p role="alert" className={`${mode === "attendee" ? "sm:col-span-2" : ""} rounded-lg border border-red-400/30 bg-red-400/5 p-3 text-sm text-red-200`}>{message}</p>}
      {gate && <AccountGate code={gate} returnTo={destination} />}
      {uncertain && mode === "login" && <button type="button" className="text-[#66fcf1] underline" onClick={() => window.dispatchEvent(new Event("aventix:session-updated"))}>Check current account</button>}
      <button type="submit" disabled={busy || !configured || (mode === "reset" && recovery !== "valid")} className={`${submitClass} ${mode === "attendee" ? "sm:col-span-2" : ""}`}>{busy ? "Please wait…" : mode === "login" ? "Login" : mode === "attendee" ? "Register" : mode === "forgot" ? "Request recovery link" : "Reset password"}</button>
      {mode === "reset" && <Link className="block text-center text-sm text-[#66fcf1]" href="/forgot-password">Request a new recovery link</Link>}
    </form>}
    {!success && <p className={`${styles.footer} text-center text-[13px] text-[#9fa3a8]`}>{mode === "login" ? <>New to Aventix? <Link className="hover:text-[#66fcf1]" href={authHref("/register", destination)}>Create an account</Link></> : <>{mode === "attendee" ? "Already have an account? " : "Back to "}<Link className="hover:text-[#66fcf1]" href={authHref("/login", destination)}>Log in</Link></>}</p>}
  </>;
}
