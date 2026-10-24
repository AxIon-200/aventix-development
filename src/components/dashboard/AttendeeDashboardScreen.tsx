"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AttendeeDashboardOverview from "./AttendeeDashboardOverview";
import DashboardSidebar from "./DashboardSidebar";
import DashboardTopbar from "./DashboardTopbar";
import AccountGate from "@/components/auth/AccountGate";
import { useAccountSession, type AccountState } from "@/components/auth/useAccountSession";
import { publicAuthClient } from "@/lib/auth/client";
import { accountSession } from "@/lib/auth/account-session";
import { workspaceNavigation } from "@/lib/auth/workspace";

export default function AttendeeDashboardScreen({ initial }: { initial: AccountState }) {
  const route = `${usePathname()}?${useSearchParams().toString()}`;
  const account = useAccountSession(publicAuthClient, initial, route);
  const router = useRouter();

  useEffect(() => {
    accountSession(publicAuthClient).navigate(route);
  }, [route]);

  useEffect(() => {
    if (!account.loading && !account.unavailable && !account.session) router.replace("/login");
  }, [account.loading, account.unavailable, account.session, router]);

  if (account.loading) return <main id="main-content" className="p-8" role="status">Checking your current account…</main>;
  if (account.unavailable) return <main id="main-content" className="mx-auto max-w-3xl space-y-4 p-8">
    <h1 className="text-2xl font-semibold">Dashboard unavailable</h1>
    <AccountGate code={account.error ?? "UNAVAILABLE"} />
    <button type="button" onClick={() => { account.retry(); router.refresh(); }} className="text-[#66fcf1] underline">Retry account check</button>
  </main>;

  const session = account.session;
  if (!session) return <main id="main-content" className="p-8"><Link href="/login" className="text-[#66fcf1] underline">Log in to continue</Link></main>;
  if (session.role !== "ATTENDEE") return <main id="main-content" className="mx-auto max-w-3xl space-y-4 p-8" role="alert">
    <h1 className="text-2xl font-semibold">Access denied</h1>
    <p>This account does not have access to the attendee dashboard.</p>
    <Link href={workspaceNavigation[session.role][0].href} className="text-[#66fcf1] underline">Go to your permitted workspace</Link>
  </main>;

  const firstName = session.displayName.trim().split(/\s+/)[0] || "there";
  return <div className="flex min-h-screen bg-[#0B0F19]">
    <DashboardSidebar />
    <div className="min-w-0 flex-1">
      <DashboardTopbar attendeeName={session.displayName} />
      <main id="main-content" className="space-y-6 p-4 sm:p-6 lg:p-8">
        <AttendeeDashboardOverview attendeeName={firstName} />
      </main>
    </div>
  </div>;
}
