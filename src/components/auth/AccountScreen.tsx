import { type ReactNode } from "react";
import { currentServerAccount } from "@/lib/auth/server";
import { AuthClientError } from "@/lib/auth/errors";
import AccountEntry from "./AccountEntry";
import type { AccountState } from "./useAccountSession";

export default async function AccountScreen({ children, returnTo }: { children: ReactNode; returnTo?: string }) {
  let initial: AccountState;
  try { initial = { loading: false, session: await currentServerAccount(), unavailable: false }; }
  catch (error) { initial = { loading: false, session: null, unavailable: true, error: error instanceof AuthClientError ? error.code : "UNAVAILABLE" }; }
  return <AccountEntry initial={initial} returnTo={returnTo}>{children}</AccountEntry>;
}
