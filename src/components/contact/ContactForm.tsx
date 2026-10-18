"use client";

import React, { useState } from "react";

const SUPPORT_EMAIL = "support@aventix.ph";

type Values = { name: string; email: string; subject: string; message: string };
const EMPTY: Values = { name: "", email: "", subject: "", message: "" };

const input =
  "w-full rounded-lg border border-[#2c3644] bg-[#0b0c10] px-[13px] text-sm text-white placeholder:text-[#c5c6c7] focus:border-[#66fcf1] focus:outline-none focus:ring-1 focus:ring-[#66fcf1] aria-[invalid=true]:border-red-400";
const label = "mb-2 block text-[13px] font-semibold text-white";

export default function ContactForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [sent, setSent] = useState(false);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = "Please enter a valid email address.";
    if (!values.subject.trim()) next.subject = "Please add a subject.";
    if (values.message.trim().length < 10) next.message = "Please write at least 10 characters.";
    setErrors(next);
    if (Object.keys(next).length) { document.getElementById(Object.keys(next)[0])?.focus(); return; }

    // No contact endpoint exists yet: hand the message to the user's email app.
    const body = `${values.message}\n\n— ${values.name} (${values.email})`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(values.subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
    // Keep the draft: opening an email app is not proof of delivery.
  };

  const err = (k: keyof Values) =>
    errors[k] ? (
      <p id={`${k}-error`} className="mt-1 text-xs text-red-300">
        {errors[k]}
      </p>
    ) : null;
  const a11y = (k: keyof Values) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-3xl border border-[#2c3644] bg-[#1f2833] p-6 sm:p-8">
      <p className="mb-4 text-xs leading-5 text-[#c5c6c7]">This form prepares an email in your email app. It does not send messages directly.</p>
      <h3 className="font-display text-2xl font-bold leading-8 text-white">Send us a message</h3>

      <div className="mt-4">
        <label htmlFor="name" className={label}>Full Name</label>
        <input id="name" autoComplete="name" value={values.name} onChange={set("name")} placeholder="Enter your name" className={`${input} h-11`} {...a11y("name")} />
        {err("name")}
      </div>
      <div className="mt-4">
        <label htmlFor="email" className={label}>Email Address</label>
        <input id="email" type="email" autoComplete="email" value={values.email} onChange={set("email")} placeholder="you@example.com" className={`${input} h-11`} {...a11y("email")} />
        {err("email")}
      </div>
      <div className="mt-4">
        <label htmlFor="subject" className={label}>Subject</label>
        <input id="subject" value={values.subject} onChange={set("subject")} placeholder="What can we help you with?" className={`${input} h-11`} {...a11y("subject")} />
        {err("subject")}
      </div>
      <div className="mt-4">
        <label htmlFor="message" className={label}>Message</label>
        <textarea id="message" rows={4} value={values.message} onChange={set("message")} placeholder="Write your message here..." className={`${input} resize-y py-3`} {...a11y("message")} />
        {err("message")}
      </div>

      <button
        type="submit"
        className="mt-4 h-[50px] w-full rounded-full bg-[#66fcf1] text-sm font-bold text-[#0b0c10] transition hover:bg-[#8afff6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Open email app
      </button>
      {sent && (
        <p role="status" className="mt-3 text-sm text-[#66fcf1]">
          Your email app was requested. Review and send your message there; Aventix has not delivered it. If no app opened, email {SUPPORT_EMAIL} directly.
        </p>
      )}
    </form>
  );
}
