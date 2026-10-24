"use client";
import { useEffect, useSyncExternalStore } from "react";
import { publicAuthClient, type PublicAuthClient } from "@/lib/auth/client";
import { accountSession, checkingAccount, type AccountState } from "@/lib/auth/account-session";

export type { AccountState } from "@/lib/auth/account-session";

export function useAccountSession(client: PublicAuthClient = publicAuthClient, initial?: AccountState, route?: string) {
  const account = accountSession(client);
  const state = useSyncExternalStore(account.subscribe,
    route === undefined ? account.getSnapshot : () => account.getSnapshotForRoute(route),
    () => initial ?? checkingAccount);
  // Subscribing after the previous page unmounts can reset the shared route.
  // Record it here as well as in the root navigation observer.
  useEffect(() => {
    if (route !== undefined) account.navigate(route);
  }, [account, route]);
  return { ...state, retry: account.retry, clearSession: account.clear, rejectAccess: account.rejectAccess };
}
