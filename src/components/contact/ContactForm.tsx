"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAccountSession } from "@/components/auth/useAccountSession";

type Field = "subject" | "message";
const input =
  "w-full rounded-lg border border-[#2c3644] bg-[#0b0c10] px-[13px] text-sm text-white placeholder:text-[#c5c6c7] focus:border-[#66fcf1] focus:outline-none focus:ring-1 focus:ring-[#66fcf1] aria-[invalid=true]:border-red-400";
const label = "mb-2 block text-[13px] font-semibold text-white";

export default function ContactForm() {
  const { session, loading, unavailable, retry } = useAccountSession();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || session?.role !== "ATTENDEE") return;
    const next: typeof errors = {};
    if (!subject.trim() || subject.trim().length > 150 || /[\r\n]/.test(subject)) next.subject = "Enter a subject of up to 150 characters.";
    if (message.trim().length < 10 || message.trim().length > 5000) next.message = "Write a message of 10 to 5,000 characters.";
    setErrors(next);
    setNotice(null);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/v1/contact", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        redirect: "error",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || typeof body?.data?.id !== "string") {
        if (response.status === 401 || body?.error?.code === "FORBIDDEN") {
          retry();
          setNotice({ kind: "error", text: "Your attendee session is no longer available. Sign in and try again." });
        } else {
          setNotice({ kind: "error", text: "Your message could not be saved. Please try again later." });
        }
        return;
      }
      setSubject("");
      setMessage("");
      setNotice({ kind: "success", text: "Your message was submitted and saved for Aventix Support." });
    } catch {
      setNotice({ kind: "error", text: "We could not confirm whether your message was saved. Please wait before trying again." });
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (field: Field) => errors[field] && (
    <p id={`${field}-error`} className="mt-1 text-xs text-red-300">{errors[field]}</p>
  );

  return (
    <div className="rounded-3xl border border-[#2c3644] bg-[#1f2833] p-6 sm:p-8">
      <h3 className="font-display text-2xl font-bold leading-8 text-white">Send us a message</h3>
      {loading ? <p role="status" className="mt-4 text-sm text-[#c5c6c7]">Checking your attendee account…</p>
        : unavailable ? <div className="mt-4 text-sm text-amber-200"><p>We could not check your account.</p><button type="button" onClick={retry} className="mt-2 text-[#66fcf1] underline">Retry account check</button></div>
          : !session ? <p className="mt-4 text-sm text-[#c5c6c7]">Sign in with an attendee account to send a message. <Link href="/login" className="text-[#66fcf1] underline">Log in</Link></p>
            : session.role !== "ATTENDEE" ? <p className="mt-4 text-sm text-[#c5c6c7]">Use an attendee account to send a support message.</p>
              : <form onSubmit={onSubmit} noValidate aria-busy={busy}>
                <p className="mt-4 text-xs leading-5 text-[#c5c6c7]">We’ll save this message with the name and email on your attendee account.</p>
                <div className="mt-4">
                  <label htmlFor="contact-name" className={label}>Full Name</label>
                  <input id="contact-name" value={session.displayName} readOnly className={`${input} h-11 text-[#c5c6c7]`} />
                </div>
                <div className="mt-4">
                  <label htmlFor="contact-email" className={label}>Email Address</label>
                  <input id="contact-email" type="email" value={session.email ?? ""} readOnly className={`${input} h-11 text-[#c5c6c7]`} />
                </div>
                <div className="mt-4">
                  <label htmlFor="subject" className={label}>Subject</label>
                  <input id="subject" value={subject} onChange={event => { setSubject(event.target.value); setErrors(current => ({ ...current, subject: undefined })); }} maxLength={150} placeholder="What can we help you with?" className={`${input} h-11`} aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "subject-error" : undefined} />
                  {fieldError("subject")}
                </div>
                <div className="mt-4">
                  <label htmlFor="message" className={label}>Message</label>
                  <textarea id="message" rows={4} value={message} onChange={event => { setMessage(event.target.value); setErrors(current => ({ ...current, message: undefined })); }} maxLength={5000} placeholder="Write your message here..." className={`${input} resize-y py-3`} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined} />
                  {fieldError("message")}
                </div>
                <button type="submit" disabled={busy} className="mt-4 h-[50px] w-full rounded-full bg-[#66fcf1] text-sm font-bold text-[#0b0c10] transition hover:bg-[#8afff6] disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  {busy ? "Submitting…" : "Submit message"}
                </button>
                {notice && <p role={notice.kind === "error" ? "alert" : "status"} className={`mt-3 text-sm ${notice.kind === "error" ? "text-red-300" : "text-[#66fcf1]"}`}>{notice.text}</p>}
              </form>}
    </div>
  );
}
