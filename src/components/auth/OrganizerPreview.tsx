"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import FormField, { fieldClass, submitClass } from "./FormField";
import Dialog from "./Dialog";
import { authHref } from "@/lib/auth/destination";

export default function OrganizerPreview({ returnTo }: { returnTo?: string }) {
  const [step, setStep] = useState(1);
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const move = (value: number) => { setStep(value); heading.current?.focus(); };
  return <>
    <Link href={authHref("/register", returnTo)} className="mb-3 inline-block text-xs text-[#66fcf1]">← Back</Link>
    <h1 ref={heading} tabIndex={-1} className="text-center text-[26px] font-semibold">Apply as an Organizer</h1>
    <p className="mt-2 text-center text-sm text-[#9fa3a8]">{step === 1 ? "Tell us about yourself and your organization." : "Set up your login credentials and describe your organization."}</p>
    <p className="mt-2 text-center text-xs text-[#66fcf1]">Step {step} of 2</p>
    <p className="my-5 rounded-lg border border-amber-400/25 bg-amber-400/5 p-3 text-xs leading-5 text-amber-200">Design preview — applications are not open. Onboarding policy is awaiting agreement. These fields are disabled and collect no data.</p>
    <div hidden={step !== 1} className="space-y-5">
      <fieldset disabled className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2"><FormField name="org-first" label="First Name" placeholder="Enter first name" /><FormField name="org-last" label="Last Name" placeholder="Enter last name" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><FormField name="org-email" label="Email Address" placeholder="Enter your email" /><FormField name="org-phone" label="Phone Number" placeholder="Phone number" /></div>
        <FormField name="org-name" label="Organization / Company Name" placeholder="Enter organization or company name" />
        <label className="block text-[13px] font-semibold text-[#c5c6c7]">Organizer Type<select className={`${fieldClass} mt-2`} defaultValue=""><option value="">Select organizer type</option></select></label>
      </fieldset>
      <button type="button" onClick={() => move(2)} className={submitClass}>Preview next step</button>
    </div>
    <div hidden={step !== 2} className="space-y-5">
      <fieldset disabled className="space-y-5">
        <label className="block text-[13px] font-semibold text-[#c5c6c7]">Short Description<textarea className={`${fieldClass} mt-2 h-24 py-3`} placeholder="Briefly describe your organization and the events you plan to host" /></label>
        <FormField name="org-username" label="Username" placeholder="Choose a username" />
        <div className="grid gap-4 sm:grid-cols-2"><FormField name="org-password" label="Password" type="password" placeholder="Create password" /><FormField name="org-confirm" label="Confirm Password" type="password" placeholder="Confirm password" /></div>
      </fieldset>
      <p className="rounded-xl border border-[#2c3644] bg-[#181f27] p-4 text-xs text-[#aeb6c2]">Organizer privileges require backend authorization. No application can be submitted in this preview.</p>
      <button type="button" disabled className={submitClass}>Submit Organizer Application — unavailable</button>
      <button type="button" onClick={() => setOpen(true)} className="w-full text-sm text-[#66fcf1]">View application notice</button>
      <button type="button" onClick={() => move(1)} className="w-full text-sm text-[#66fcf1]">← Back to previous step</button>
    </div>
    <p className="mt-6 text-center text-[13px] text-[#aeb6c2]">Already have an account? <Link href={authHref("/login", returnTo)} className="text-[#66fcf1]">Log in</Link></p>
    <Dialog open={open} onClose={() => setOpen(false)} title="Applications not open yet">
      <p className="my-5 text-sm leading-6 text-[#c5c6c7]">The organizer onboarding policy and service are awaiting agreement. No application has been submitted.</p>
      <div className="my-6 border-t border-[#2c3644]" /><button type="button" onClick={() => setOpen(false)} className={`${submitClass} rounded-xl bg-gradient-to-r from-[#45a29e] to-[#66fcf1]`}>Got it</button>
    </Dialog>
  </>;
}
