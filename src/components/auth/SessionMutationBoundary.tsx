"use client";
import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import SignOutButton from "./SignOutButton";
import { useAccountSession } from "./useAccountSession";
import AccountGate from "./AccountGate";
import { authHref } from "@/lib/auth/destination";

/** Hide mounted workspace content whenever account state is unknown or ineligible.
 * Exact role/page and API authorization remain separate S01 work.
 */
export default function SessionMutationBoundary({ children }: { children: ReactNode }) {
  const account = useAccountSession();
  const pathname = usePathname();
  const workspace = /^\/(?:dashboard|organizer|admin|bookings)(?:\/|$)/.test(pathname ?? "")
    || /^\/events\/[^/]+\/(?:tickets|seats)$/.test(pathname ?? "");
  if (!workspace || account.session) return children;
  return <main id="main-content" className="mx-auto max-w-xl space-y-6 px-6 py-24">
    {account.loading ? <p role="status">Checking your current account…</p>
      : account.unavailable ? <>
        <AccountGate code={account.error ?? "UNAVAILABLE"} returnTo={pathname ?? undefined} />
        {account.error === "LOGOUT_UNCERTAIN"
          ? <SignOutButton className="text-[#66fcf1] underline">Retry sign-out</SignOutButton>
          : <button type="button" className="text-[#66fcf1] underline" onClick={account.retry}>Retry account check</button>}
      </> : <>
        <h1 className="text-2xl">Log in to continue</h1>
        <Link className="text-[#66fcf1] underline" href={authHref("/login", pathname ?? undefined)}>Log in</Link>
      </>}
    <Link href="/events" className="block text-[#66fcf1] underline">Browse public events</Link>
  </main>;
}
