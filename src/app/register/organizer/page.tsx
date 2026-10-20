import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import OrganizerPreview from "@/components/auth/OrganizerPreview";
import AccountScreen from "@/components/auth/AccountScreen";
import { safeReturnTo } from "@/lib/auth/destination";

export const metadata: Metadata = { title: "Organizer application preview | Aventix", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(typeof params.returnTo === "string" ? params.returnTo : undefined);
  return <AuthShell><AccountScreen returnTo={returnTo}><OrganizerPreview returnTo={returnTo} /></AccountScreen></AuthShell>;
}
