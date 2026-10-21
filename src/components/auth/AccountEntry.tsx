"use client";
import Link from "next/link";
import { type ReactNode } from "react";
import { publicAuthClient } from "@/lib/auth/client";
import { accountDestination } from "@/lib/auth/profile";
import { useAccountSession, type AccountState } from "./useAccountSession";
import SignOutButton from "./SignOutButton";
import AccountGate from "./AccountGate";
import { submitClass } from "./FormField";

export default function AccountEntry({ children, returnTo, initial }: { children: ReactNode; returnTo?: string; initial: AccountState }) {
  const account = useAccountSession(publicAuthClient, initial);
  if (account.loading) return <p role="status">Checking your current account…</p>;
  if (account.error || account.unavailable) return <div>
    <AccountGate code={account.error ?? "UNAVAILABLE"} returnTo={returnTo} />
    <button type="button" className={submitClass} onClick={account.retry}>Retry account check</button>

    <SignOutButton switchAccount returnTo={returnTo} className="mt-4 text-[#66fcf1] underline">Retry sign-out / use another account</SignOutButton>
  </div>;
  if (!account.session) return children;
  return <div className="space-y-5">
    <h1 className="text-2xl">You are signed in</h1>
    <p>{account.session.displayName} · {account.session.email}</p>
    <Link className={submitClass} href={accountDestination(account.session, returnTo)}>Continue</Link>
    <SignOutButton switchAccount returnTo={returnTo} className="text-[#66fcf1] underline">Sign out to use another account</SignOutButton>
  </div>;
}
