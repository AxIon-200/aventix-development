"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { publicAuthClient, type AccountRole } from "@/lib/auth/client";
import { authHref } from "@/lib/auth/destination";
import { workspaceNavigation } from "@/lib/auth/workspace";
import { useAccountSession, type AccountState } from "./useAccountSession";
import AccountGate from "./AccountGate";
import SignOutButton from "./SignOutButton";
import AttendeeProfile, { hasUnsavedProfileChanges, type ProfileDraftState } from "./AttendeeProfile";
import ChangePasswordForm from "./ChangePasswordForm";

/** No protected children or sample records are serialized behind this guard. */
export default function WorkspaceScreen({ role, title, returnTo, initial, accountScreen }: {
  role: AccountRole; title: string; returnTo?: string; initial: AccountState; accountScreen?: "profile" | "settings";
}) {
  const route = `${usePathname()}?${useSearchParams().toString()}`;
  const account = useAccountSession(publicAuthClient, initial, route);
  const router = useRouter();
  const signingOut = useRef(false);
  const [profileState, setProfileState] = useState<ProfileDraftState | null>(null);
  const currentUserId = account.session?.userId;
  const hasDraft = useCallback(() => accountScreen === "profile" && (!currentUserId || currentUserId === profileState?.userId)
    && hasUnsavedProfileChanges(profileState), [accountScreen, currentUserId, profileState]);
  const confirmLeave = useCallback(() => !hasDraft() || window.confirm("You have unsaved personal account changes. Discard them and leave this page?"), [hasDraft]);
  const confirmNavigation = (event: MouseEvent<HTMLElement>) => {
    // Include recovery and account-gate links nested inside the account forms.
    // Modified clicks and new tabs leave this document and its draft in place.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const destination = new URL(link.href);
    if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
    if (!confirmLeave()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const signOutCallbacks = {
    onStart: () => { signingOut.current = true; },
    onFailure: () => { signingOut.current = false; },
  };
  useEffect(() => {
    if (!signingOut.current && !account.loading && !account.unavailable && !account.session) {
      router.replace(authHref("/login", returnTo));
    }
  }, [account.loading, account.unavailable, account.session, router, returnTo]);
  useEffect(() => {
    if (accountScreen !== "profile") return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!hasDraft()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [accountScreen, hasDraft]);
  useEffect(() => {
    if (accountScreen !== "profile") return;
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    if (!navigation) return;
    const currentPath = new URL(route, window.location.origin).pathname;
    const onBackOrForward = (event: Event) => {
      const traverse = event as Event & { navigationType?: string; destination?: { url: string } };
      if (traverse.navigationType !== "traverse" || !traverse.destination || !event.cancelable
        || new URL(traverse.destination.url).pathname === currentPath || !hasDraft()) return;
      if (!confirmLeave()) event.preventDefault();
    };
    navigation.addEventListener("navigate", onBackOrForward);
    return () => navigation.removeEventListener("navigate", onBackOrForward);
  }, [accountScreen, hasDraft, confirmLeave, route]);

  const session = account.session;
  return <main id="main-content" onClickCapture={confirmNavigation} className="mx-auto min-h-screen max-w-4xl space-y-6 px-6 py-16">
    <Link href="/events" className="inline-block text-[#66fcf1] underline">Browse public events</Link>
    {account.loading ? <p role="status">Checking your current account…</p>
      : account.unavailable ? <section className="space-y-4">
        <h1 className="text-3xl font-semibold">Workspace unavailable</h1>
        <AccountGate code={account.error ?? "UNAVAILABLE"} returnTo={returnTo} />
        {account.error === "LOGOUT_UNCERTAIN"
          ? <SignOutButton {...signOutCallbacks} className="text-[#66fcf1] underline">Retry sign-out</SignOutButton>
          : <button type="button" className="text-[#66fcf1] underline" onClick={() => { account.retry(); router.refresh(); }}>Retry account check</button>}
      </section>
      : !session ? <section>
        <h1 className="text-3xl font-semibold">Log in to continue</h1>
        <Link href={authHref("/login", returnTo)} className="text-[#66fcf1] underline">Log in</Link>
      </section>
      : session.role !== role ? <section className="space-y-4" role="alert">
        <h1 className="text-3xl font-semibold">Access denied</h1>
        <p>This account does not have access to this workspace.</p>
        <Link href={workspaceNavigation[session.role][0].href} className="text-[#66fcf1] underline">Go to your permitted workspace</Link>
      </section>
      : <>
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">{title}</h1>
          {accountScreen !== "profile" && <p>Signed in as {session.displayName} · {session.email}</p>}
        </header>
        <nav aria-label="Workspace" className="flex flex-wrap gap-4 border-y border-slate-700 py-4">
          {workspaceNavigation[role].map(item => <Link key={item.href} href={item.href} prefetch={false} className="text-[#66fcf1] underline">{item.label}</Link>)}
        </nav>
        {accountScreen === "profile" ? <div className="space-y-6">
          <AttendeeProfile key={session.userId} session={session} returnTo={role === "ATTENDEE" ? "/dashboard/profile" : "/admin/profile"} onAccessRejected={account.rejectAccess} retainedProfile={profileState} onProfileChange={setProfileState} />
          <ChangePasswordForm key={`password-${session.userId}`} session={session} returnTo={role === "ATTENDEE" ? "/dashboard/profile" : "/admin/profile"} onAccessRejected={account.rejectAccess} />
        </div> : accountScreen === "settings" ? <div className="space-y-6">
          <ChangePasswordForm key={session.userId} session={session} returnTo="/admin/settings" onAccessRejected={account.rejectAccess} />
          <section className="rounded-2xl border border-slate-700 bg-[#151b23] p-6">
            <h2 className="text-xl font-semibold">Other settings are unavailable</h2>
            <p className="mt-3 text-slate-300">Additional preferences and security controls are still being built.</p>
          </section>
        </div> : <section className="rounded-2xl border border-slate-700 bg-[#151b23] p-6">
          <h2 className="text-xl font-semibold">This feature is unavailable</h2>
          <p className="mt-3 text-slate-300">This workspace is still being built. Account information comes from your current account; tickets, bookings, payments, and workspace tools are not available yet.</p>
        </section>}
      </>}
    {!account.loading && session && <SignOutButton {...signOutCallbacks} onBeforeSignOut={confirmLeave} className="inline-block text-[#66fcf1] underline">Sign Out</SignOutButton>}
  </main>;
}
