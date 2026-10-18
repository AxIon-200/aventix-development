"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminProfile, UpdateProfilePayload } from "@/app/admin/types/profile";
import { ProfileError } from "@/app/admin/services/profileService";
import { FormField } from "@/app/admin/components/ui/FormField";
import { Input } from "@/app/admin/components/ui/Input";

type Draft = { fullName: string; email: string; phone: string };
type Errors = Partial<Record<keyof Draft, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,19}$/;

function toDraft(p: AdminProfile): Draft {
  return { fullName: p.fullName, email: p.email, phone: p.phone ?? "" };
}

function validate(d: Draft): Errors {
  const errors: Errors = {};
  const name = d.fullName.trim();
  if (!name) errors.fullName = "Full name is required.";
  else if (name.length < 2) errors.fullName = "Full name must be at least 2 characters.";
  else if (name.length > 80) errors.fullName = "Full name must be 80 characters or fewer.";

  if (!d.email.trim()) errors.email = "Email address is required.";
  else if (!EMAIL_RE.test(d.email.trim())) errors.email = "Enter a valid email address.";

  if (d.phone.trim() && !PHONE_RE.test(d.phone.trim())) {
    errors.phone = "Enter a valid phone number, e.g. +63 917 555 0123.";
  }
  return errors;
}

type Props = {
  profile: AdminProfile;
  // Should throw on failure. A ProfileError with a `field` is shown under that input.
  onSave: (values: UpdateProfilePayload) => Promise<void>;
};

export function PersonalInfoForm({ profile, onSave }: Props) {
  const [draft, setDraft] = useState<Draft>(toDraft(profile));
  const [touched, setTouched] = useState<Partial<Record<keyof Draft, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // When the saved profile changes (after a successful save), reset the form to it.
  useEffect(() => {
    setDraft({ fullName: profile.fullName, email: profile.email, phone: profile.phone ?? "" });
    setTouched({});
    setSubmitted(false);
    setServerErrors({});
    setFormError(null);
  }, [profile.fullName, profile.email, profile.phone]);

  const saved = toDraft(profile);
  const dirty =
    draft.fullName.trim() !== saved.fullName ||
    draft.email.trim() !== saved.email ||
    draft.phone.trim() !== saved.phone;

  // Warn before the tab is closed or reloaded with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const clientErrors = validate(draft);
  const errorFor = (field: keyof Draft) =>
    serverErrors[field] ?? (touched[field] || submitted ? clientErrors[field] : undefined);

  function update(field: keyof Draft, value: string) {
    setDraft((d) => ({ ...d, [field]: value }));
    setServerErrors((e) => ({ ...e, [field]: undefined }));
    setFormError(null);
  }

  function discard() {
    setDraft(toDraft(profile));
    setTouched({});
    setSubmitted(false);
    setServerErrors({});
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSaving(true);
    setFormError(null);
    try {
      await onSave({
        fullName: draft.fullName.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
      });
    } catch (err) {
      if (err instanceof ProfileError && err.field && err.field in draft) {
        setServerErrors({ [err.field]: err.message });
      } else {
        setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 lg:col-span-2">
      <h2 className="text-base font-semibold text-white">Personal Information</h2>
      <p className="mt-1 text-xs text-slate-500">Update the details associated with your administrator account.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="profile-name" label="Full name" error={errorFor("fullName")}>
            {(a11y) => (
              <Input
                {...a11y}
                value={draft.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                autoComplete="name"
                disabled={isSaving}
              />
            )}
          </FormField>

          <FormField id="profile-email" label="Email address" error={errorFor("email")}>
            {(a11y) => (
              <Input
                {...a11y}
                type="email"
                value={draft.email}
                onChange={(e) => update("email", e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                autoComplete="email"
                disabled={isSaving}
              />
            )}
          </FormField>

          <FormField id="profile-phone" label="Phone number" error={errorFor("phone")}>
            {(a11y) => (
              <Input
                {...a11y}
                type="tel"
                value={draft.phone}
                onChange={(e) => update("phone", e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                placeholder="+63 917 555 0123"
                autoComplete="tel"
                disabled={isSaving}
              />
            )}
          </FormField>

          <FormField id="profile-role" label="Role" hint="Your role is managed by a super admin.">
            {(a11y) => <Input {...a11y} value={profile.roleLabel} readOnly disabled />}
          </FormField>
        </div>

        {formError && (
          <p role="alert" className="mt-4 rounded-lg border border-rose-400/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-300">
            {formError}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          {dirty && !isSaving && (
            <>
              <span className="text-xs text-amber-300/90">You have unsaved changes</span>
              <button
                type="button"
                onClick={discard}
                className="rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:text-slate-200"
              >
                Discard
              </button>
            </>
          )}
          <button
            type="submit"
            disabled={!dirty || isSaving}
            className="flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-medium text-slate-950 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </section>
  );
}
