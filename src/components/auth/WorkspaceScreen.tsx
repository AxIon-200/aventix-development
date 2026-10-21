"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { publicAuthClient, type AccountRole } from "@/lib/auth/client";
import { authHref } from "@/lib/auth/destination";
import { workspaceNavigation } from "@/lib/auth/workspace";
import { useAccountSession, type AccountState } from "./useAccountSession";
import AccountGate from "./AccountGate";
import SignOutButton from "./SignOutButton";

/** No protected children or sample records are serialized behind this guard. */
export default function WorkspaceScreen({ role, title, returnTo, initial }: {
  role: AccountRole; title: string; returnTo?: string; initial: AccountState;
}) {
  const route = `${usePathname()}?${useSearchParams().toString()}`;
  const account = useAccountSession(publicAuthClient, initial, route);
  const router = useRouter();
  const signingOut = useRef(false);
  const signOutCallbacks = {
    onStart: () => { signingOut.current = true; },
    onFailure: () => { signingOut.current = false; },
  };
  useEffect(() => {
    if (!signingOut.current && !account.loading && !account.unavailable && !account.session) {
      router.replace(authHref("/login", returnTo));
    }
  }, [account.loading, account.unavailable, account.session, router, returnTo]);

  const session = account.session;
  return <main id="main-content" className="mx-auto min-h-screen max-w-4xl space-y-6 px-6 py-16">
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
          <p>Signed in as {session.displayName} · {session.email}</p>
        </header>
        <nav aria-label="Workspace" className="flex flex-wrap gap-4 border-y border-slate-700 py-4">
          {workspaceNavigation[role].map(item => <Link key={item.href} href={item.href} prefetch={false} className="text-[#66fcf1] underline">{item.label}</Link>)}
        </nav>
        <section className="rounded-2xl border border-slate-700 bg-[#151b23] p-6">
          <h2 className="text-xl font-semibold">This feature is unavailable</h2>
          <p className="mt-3 text-slate-300">This workspace is still being built. Account information comes from your current account; tickets, bookings, payments, and workspace tools are not available yet.</p>
        </section>
      </>}
    {!account.loading && session && <SignOutButton {...signOutCallbacks} className="inline-block text-[#66fcf1] underline">Sign Out</SignOutButton>}
  </main>;
}
