import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { currentServerAccount } from "@/lib/auth/server";
import { AuthClientError, type AccountRole } from "@/lib/auth/client";
import { authHref } from "@/lib/auth/destination";
import type { AccountState } from "@/lib/auth/account-session";
import WorkspaceScreen from "./WorkspaceScreen";

/** Every protected page calls this before rendering. No business data is loaded.
 * WorkspaceScreen checks the exact role during SSR and again on browser refresh.
 * Future data access must independently authorize through Express.
 */
export default async function WorkspacePage({ role, title, returnTo, accountScreen, children }: {
  role: AccountRole; title: string; returnTo?: string; accountScreen?: "profile" | "settings"; children?: ReactNode;
}) {
  let initial: AccountState;
  try {
    initial = { loading: false, session: await currentServerAccount(), unavailable: false };
  } catch (error) {
    initial = { loading: false, session: null, unavailable: true,
      error: error instanceof AuthClientError ? error.code : "UNAVAILABLE" };
  }
  if (!initial.unavailable && !initial.session) redirect(authHref("/login", returnTo));
  return <Suspense fallback={<main id="main-content" className="px-6 py-16"><p role="status">Checking your current account…</p></main>}>
    <WorkspaceScreen role={role} title={title} returnTo={returnTo} initial={initial} accountScreen={accountScreen}>{!initial.unavailable && initial.session?.role === role ? children : undefined}</WorkspaceScreen>
  </Suspense>;
}
