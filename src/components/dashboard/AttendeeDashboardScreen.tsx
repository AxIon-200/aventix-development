"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "./icons";
import StatCard from "./StatCard";
import DashboardSidebar from "./DashboardSidebar";
import DashboardTopbar from "./DashboardTopbar";
import AccountGate from "@/components/auth/AccountGate";
import { useAccountSession, type AccountState } from "@/components/auth/useAccountSession";
import { publicAuthClient } from "@/lib/auth/client";
import { accountSession } from "@/lib/auth/account-session";
import { workspaceNavigation } from "@/lib/auth/workspace";

const unavailableStats = [
  { label: "My Tickets", value: "—", badge: "Unavailable", footnote: "Ticket totals are not connected yet" },
  { label: "Upcoming Events", value: "—", badge: "Unavailable", footnote: "Upcoming event totals are not connected yet" },
  { label: "Total Spent", value: "—", badge: "Unavailable", footnote: "Purchase totals are not connected yet" },
  { label: "Reward Points", value: "—", badge: "Unavailable", footnote: "Reward points are not connected yet" },
];

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Attendee Portal</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Welcome back, {firstName}!</h1>
            <p className="mt-1 text-sm text-slate-500">View your upcoming event tickets, loyalty points, and purchase history.</p>
          </div>
          <Link href="/dashboard/buy-tickets" className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3.5 py-2 text-xs font-medium text-slate-950 transition hover:bg-teal-400">
            <PlusIcon className="h-3.5 w-3.5" /><span>Buy Tickets</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-2.5 text-xs text-teal-300">
          <p>Upcoming event details are not available yet.</p>
          <Link href="/dashboard/tickets" className="font-semibold underline hover:text-white">View your passes &rarr;</Link>
        </div>

        <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {unavailableStats.map(stat => <StatCard key={stat.label} {...stat} />)}
        </section>

        <section aria-label="Upcoming events">
          <div className="overflow-x-auto rounded-2xl border border-[#2c3644] bg-[#0b0c10]">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead><tr className="border-b border-[#2c3644] text-[#c5c6c7]">
                <th scope="col" className="w-[300px] p-4 font-semibold">Event</th>
                <th scope="col" className="w-[180px] p-4 font-semibold">Ticket Tier</th>
                <th scope="col" className="p-4 font-semibold">Date &amp; Venue</th>
                <th scope="col" className="w-[140px] p-4 font-semibold">Status</th>
                <th scope="col" className="p-4 font-semibold">Action</th>
              </tr></thead>
              <tbody><tr><td colSpan={5} className="p-8 text-center text-sm text-[#c5c6c7]">
                Your upcoming events are not available yet. <Link href="/events" className="font-semibold text-[#66fcf1] hover:underline">Browse events</Link>
              </td></tr></tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  </div>;
}
