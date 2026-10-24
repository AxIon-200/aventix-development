import { redirect } from "next/navigation";
import { Suspense } from "react";
import { currentServerAccount } from "@/lib/auth/server";
import { AuthClientError } from "@/lib/auth/errors";
import type { AccountState } from "@/lib/auth/account-session";
import AttendeeDashboardScreen from "@/components/dashboard/AttendeeDashboardScreen";

export const metadata = { title: "Attendee dashboard | Aventix", robots: { index: false, follow: false } };

export default async function Page() {
  let initial: AccountState;
  try {
    initial = { loading: false, session: await currentServerAccount(), unavailable: false };
  } catch (error) {
    initial = { loading: false, session: null, unavailable: true,
      error: error instanceof AuthClientError ? error.code : "UNAVAILABLE" };
  }
  if (!initial.unavailable && !initial.session) redirect("/login");
  return <Suspense fallback={<main id="main-content" className="p-8" role="status">Checking your current account…</main>}>
    <AttendeeDashboardScreen initial={initial} />
  </Suspense>;
}
