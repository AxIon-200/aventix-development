"use client";
import { useSyncExternalStore } from "react";
import { publicAuthClient, type PublicAuthClient } from "@/lib/auth/client";
import { accountSession, checkingAccount, type AccountState } from "@/lib/auth/account-session";

export type { AccountState } from "@/lib/auth/account-session";

export function useAccountSession(client: PublicAuthClient = publicAuthClient, initial?: AccountState) {
  const account = accountSession(client);
  const state = useSyncExternalStore(account.subscribe, account.getSnapshot, () => initial ?? checkingAccount);
  return { ...state, retry: account.retry, clearSession: account.clear };
}
