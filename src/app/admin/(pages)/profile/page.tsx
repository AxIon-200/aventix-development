"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { useAccountSession } from "@/components/auth/useAccountSession";
import AccountGate from "@/components/auth/AccountGate";
import AttendeeProfile, { hasUnsavedProfileChanges, type ProfileDraftState } from "@/components/auth/AttendeeProfile";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import type { AccountSession } from "@/lib/auth/client";
import { getProfile } from "@/app/admin/services/profileService";
import { useFetch } from "@/app/admin/hooks/useFetch";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { ProfileSummaryCard } from "@/app/admin/components/profile/ProfileSummaryCard";
import { AccountActivityCard } from "@/app/admin/components/profile/AccountActivityCard";

function ProfileContent({ session, onAccessRejected, draft, setDraft }: {
  session: AccountSession;
  onAccessRejected: Parameters<typeof AttendeeProfile>[0]["onAccessRejected"];
  draft: ProfileDraftState | null;
  setDraft: Dispatch<SetStateAction<ProfileDraftState | null>>;
}) {
  const profile = useFetch(getProfile, []);
  const dirty = draft?.userId === session.userId && hasUnsavedProfileChanges(draft);
  const saved = draft?.userId === session.userId ? draft.saved : null;

  useEffect(() => {
    if (!saved) return;
    window.dispatchEvent(new CustomEvent("admin-profile-updated", {
      detail: { fullName: saved.name, roleLabel: "Administrator" },
    }));
  }, [saved]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const leave = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const destination = new URL(link.href);
      if (destination.pathname === window.location.pathname && destination.origin === window.location.origin) return;
      if (!window.confirm("You have unsaved personal account changes. Discard them and leave this page?")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    const traverse = (event: Event) => {
      const navigation = event as Event & { navigationType?: string };
      if (navigation.navigationType === "traverse" && event.cancelable
        && !window.confirm("Discard your unsaved personal account changes?")) event.preventDefault();
    };
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", leave, true);
    navigation?.addEventListener("navigate", traverse);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", leave, true);
      navigation?.removeEventListener("navigate", traverse);
    };
  }, [dirty]);

  const summary = profile.data?.id === session.userId ? {
    ...profile.data,
    ...(saved ? { fullName: saved.name, email: saved.email, phone: saved.phoneNumber } : {}),
  } : null;

  return <div className="space-y-6">
    <div className="grid items-start gap-6 lg:grid-cols-3">
      {summary ? <ProfileSummaryCard profile={summary} /> : profile.isLoading ? <p role="status">Loading account summary…</p> : <ErrorState title="Account summary unavailable" message={profile.error ?? "Could not confirm your account summary."} onRetry={profile.refetch} />}
      <div className="lg:col-span-2">
        <AttendeeProfile session={session} returnTo="/admin/profile" onAccessRejected={onAccessRejected} retainedProfile={draft} onProfileChange={setDraft} />
      </div>
    </div>
    <ChangePasswordForm session={session} returnTo="/admin/profile" onAccessRejected={onAccessRejected} onChanged={() => { profile.refetch(); }} />
    {summary && <AccountActivityCard profile={summary} />}
  </div>;
}

export default function ProfilePage() {
  const account = useAccountSession();
  // Preserve an unsaved draft while focus/navigation temporarily rechecks access.
  const [draft, setDraft] = useState<ProfileDraftState | null>(null);
  return <div className="space-y-6">
    <PageHeader eyebrow="Settings / User Profile" title="User Profile" description="Manage your personal account information and password." />
    {account.loading ? <p role="status">Checking your account…</p>
      : account.unavailable ? <div><AccountGate code={account.error ?? "UNAVAILABLE"} returnTo="/admin/profile" /><button onClick={account.retry}>Retry account check</button></div>
      : !account.session ? <Link href="/login?returnTo=%2Fadmin%2Fprofile">Log in to manage your profile</Link>
      : account.session.role !== "ADMINISTRATOR" ? <p role="alert">This page requires an administrator account.</p>
      : <ProfileContent key={account.session.userId} session={account.session} onAccessRejected={account.rejectAccess} draft={draft} setDraft={setDraft} />}
  </div>;
}
