"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { authErrorMessage, AuthClientError, publicAuthClient, type AccountSession, type AuthErrorCode, type PersonalAccountProfile, type ProfileChanges } from "@/lib/auth/client";
import { nameError, validPhone } from "@/lib/auth/validation";
import { saveProfile } from "@/lib/auth/save-profile";
import AccountGate from "./AccountGate";
import FormField, { submitClass } from "./FormField";

type Draft = { firstName: string; lastName: string; phoneNumber: string };
export type ProfileDraftState = { userId: string; saved: PersonalAccountProfile; draft: Draft };
const fromProfile = (profile: PersonalAccountProfile): Draft => ({
  firstName: profile.firstName, lastName: profile.lastName, phoneNumber: profile.phoneNumber ?? "",
});
const changedFields = (saved: PersonalAccountProfile, draft: Draft): ProfileChanges => ({
  ...(draft.firstName.trim() !== saved.firstName ? { firstName: draft.firstName.trim() } : {}),
  ...(draft.lastName.trim() !== saved.lastName ? { lastName: draft.lastName.trim() } : {}),
  ...(draft.phoneNumber !== (saved.phoneNumber ?? "") ? { phoneNumber: draft.phoneNumber === "" ? null : draft.phoneNumber } : {}),
});
export const hasUnsavedProfileChanges = (state: ProfileDraftState | null) =>
  state !== null && Object.keys(changedFields(state.saved, state.draft)).length > 0;

export default function AttendeeProfile({ session, returnTo, onAccessRejected, retainedProfile, onProfileChange }: {
  session: AccountSession; onAccessRejected: (code: AuthErrorCode, expectedUserId: string) => void;
  returnTo: string;
  retainedProfile: ProfileDraftState | null; onProfileChange: (state: ProfileDraftState) => void;
}) {
  const retained = retainedProfile?.userId === session.userId ? retainedProfile : null;
  const [saved, setSaved] = useState<PersonalAccountProfile | null>(retained?.saved ?? null);
  const [draft, setDraft] = useState<Draft | null>(retained?.draft ?? null);
  const draftRef = useRef<Draft | null>(retained?.draft ?? null);
  const savedRef = useRef<PersonalAccountProfile | null>(retained?.saved ?? null);
  const [error, setError] = useState<AuthClientError | null>(null);
  const [saveError, setSaveError] = useState<AuthClientError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (!publicAuthClient.getProfile) throw new AuthClientError("UNAVAILABLE");
        const current = await publicAuthClient.getProfile();
        if (current.id !== session.userId || current.role !== session.role) throw new AuthClientError("INVALID_RESPONSE");
        if (active) {
          const previous = savedRef.current;
          const currentDraft = draftRef.current;
          const next = fromProfile(current);
          if (previous && currentDraft) {
            const edited = changedFields(previous, currentDraft);
            if ("firstName" in edited) next.firstName = currentDraft.firstName;
            if ("lastName" in edited) next.lastName = currentDraft.lastName;
            if ("phoneNumber" in edited) next.phoneNumber = currentDraft.phoneNumber;
          }
          savedRef.current = current;
          setSaved(current);
          draftRef.current = next;
          setDraft(next);
          onProfileChange({ userId: session.userId, saved: current, draft: next });
          setError(null);
        }
      } catch (cause) {
        if (active) {
          const issue = cause instanceof AuthClientError ? cause : new AuthClientError("UNAVAILABLE");
          if (["AUTHENTICATION_REQUIRED", "ACCOUNT_DISABLED", "EMAIL_VERIFICATION_REQUIRED",
            "TERMS_ACCEPTANCE_REQUIRED", "PASSWORD_RESET_REQUIRED"].includes(issue.code)) {
            onAccessRejected(issue.code, session.userId);
          } else setError(issue);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session.userId, onAccessRejected, onProfileChange, revision]);

  const refresh = () => {
    setError(null);
    setLoading(true);
    setRevision(value => value + 1);
  };
  const edit = (field: keyof Draft, value: string) => {
    if (!draftRef.current) return;
    const next = { ...draftRef.current, [field]: value };
    draftRef.current = next;
    if (savedRef.current) onProfileChange({ userId: session.userId, saved: savedRef.current, draft: next });
    setDraft(next);
    setFieldErrors(previous => ({ ...previous, [field]: "" }));
    setSaveError(null);
    setMessage("");
  };
  const discard = () => {
    if (!saved || busy) return;
    const next = fromProfile(saved);
    draftRef.current = next;
    onProfileChange({ userId: session.userId, saved, draft: next });
    setDraft(next);
    setFieldErrors({});
    setSaveError(null);
    setMessage("");
  };
  const changes = saved && draft ? changedFields(saved, draft) : {};
  const dirty = Object.keys(changes).length > 0;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || !saved || !draft || !dirty || !publicAuthClient.updateProfile) return;
    const nextErrors: Record<string, string> = {};
    for (const field of ["firstName", "lastName"] as const) {
      const issue = nameError(draft[field]);
      if (issue) nextErrors[field] = issue;
    }
    if (draft.phoneNumber !== "" && !validPhone(draft.phoneNumber)) {
      nextErrors.phoneNumber = "Use 09 plus nine digits or +639 plus nine digits, without spaces or hyphens.";
    }
    setFieldErrors(nextErrors);
    setSaveError(null);
    setMessage("");
    if (Object.keys(nextErrors).length > 0) {
      event.currentTarget.querySelector<HTMLElement>(Object.keys(nextErrors).map(field => `[name="${field}"]`).join(","))?.focus();
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      const { profile: current, reconciled } = await saveProfile(publicAuthClient, saved, changes);
      savedRef.current = current;
      setSaved(current);
      const accepted = fromProfile(current);
      draftRef.current = accepted;
      onProfileChange({ userId: session.userId, saved: current, draft: accepted });
      setDraft(accepted);
      setMessage(reconciled ? "Your personal account profile was saved and confirmed by a fresh account check." : "Your personal account profile was saved.");
    } catch (cause) {
      const issue = cause instanceof AuthClientError ? cause : new AuthClientError("REQUEST_UNCERTAIN");
      if (["AUTHENTICATION_REQUIRED", "ACCOUNT_DISABLED", "EMAIL_VERIFICATION_REQUIRED",
        "TERMS_ACCEPTANCE_REQUIRED", "PASSWORD_RESET_REQUIRED"].includes(issue.code)) {
        onAccessRejected(issue.code, session.userId);
      }
      setFieldErrors(issue.fieldErrors);
      setSaveError(issue);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return <section aria-labelledby="personal-profile-title" className="rounded-2xl border border-slate-700 bg-[#151b23] p-5 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="personal-profile-title" className="text-xl font-semibold sm:text-2xl">Personal account profile</h2>
        <p className="mt-2 text-sm text-slate-300">Details for the {session.role === "ATTENDEE" ? "attendee" : "administrator"} account you are using now.</p>
      </div>
      {!loading && <button type="button" onClick={refresh} disabled={busy} className="rounded-lg border border-[#66fcf1] px-4 py-2 text-sm font-medium text-[#66fcf1] hover:bg-[#66fcf1]/10 disabled:opacity-50">Refresh details</button>}
    </div>
    {loading && !saved ? <p role="status" className="mt-8 text-slate-300">Loading your personal account profile…</p> : null}
    {error && <div className="mt-6 space-y-3" role="alert">
      <AccountGate code={error.code} returnTo={returnTo} />
      {error.code === "INVALID_RESPONSE" && <p className="text-sm text-slate-300">We could not confirm that these details belong to your current account.</p>}
    </div>}
    {!loading && !error && saved && draft && <form onSubmit={save} noValidate aria-busy={busy} className="mt-8 space-y-6">
      <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
        <FormField name="firstName" label="First name" autoComplete="given-name" value={draft.firstName} onChange={event => edit("firstName", event.target.value)} error={fieldErrors.firstName} required />
        <FormField name="lastName" label="Last name" autoComplete="family-name" value={draft.lastName} onChange={event => edit("lastName", event.target.value)} error={fieldErrors.lastName} required />
        <div className="min-w-0"><p className="mb-2 text-[13px] font-semibold text-[#c5c6c7]">Email address (read only)</p><p className="break-all text-base">{saved.email}</p></div>
        <FormField name="phoneNumber" label="Phone number (optional)" type="tel" autoComplete="tel" value={draft.phoneNumber} onChange={event => edit("phoneNumber", event.target.value)} error={fieldErrors.phoneNumber} hint="Use 09 plus nine digits or +639 plus nine digits. Clear this field to remove your phone number." />
      </fieldset>
      <p className="text-sm text-slate-300">Saved name: <strong className="break-words text-white">{saved.name}</strong></p>
      {saveError && <p role="alert" className="rounded-lg border border-red-400/30 p-3 text-sm text-red-200">{saveError.code === "REQUEST_UNCERTAIN" ? "We could not confirm whether your changes were saved. Your draft is still here. Refresh your details before choosing whether to save again." : authErrorMessage(saveError)}</p>}
      {message && <p role="status" className="text-sm text-[#66fcf1]">{message}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={!dirty || busy || !publicAuthClient.updateProfile} className={`${submitClass} sm:w-auto`}>{busy ? "Saving…" : "Save changes"}</button>
        <button type="button" onClick={discard} disabled={!dirty || busy} className="min-h-11 rounded-full border border-slate-500 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Discard changes</button>
      </div>
    </form>}
    {!loading && !saved && !error && <p role="alert" className="mt-6 text-amber-200">{authErrorMessage(new AuthClientError("UNAVAILABLE"))}</p>}
  </section>;
}
