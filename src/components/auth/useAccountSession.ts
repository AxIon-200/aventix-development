"use client";
import { useSyncExternalStore } from "react";
import { publicAuthClient, type PublicAuthClient } from "@/lib/auth/client";
import { accountSession, checkingAccount, type AccountState } from "@/lib/auth/account-session";

export type { AccountState } from "@/lib/auth/account-session";

export function useAccountSession(client: PublicAuthClient = publicAuthClient, initial?: AccountState, route?: string) {
  const account = accountSession(client);
  const state = useSyncExternalStore(account.subscribe,
    route === undefined ? account.getSnapshot : () => account.getSnapshotForRoute(route),
    () => initial ?? checkingAccount);
  return { ...state, retry: account.retry, clearSession: account.clear };
}
