import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import RegistrationForm from "@/components/auth/RegistrationForm";
import AccountScreen from "@/components/auth/AccountScreen";
import { safeReturnTo } from "@/lib/auth/destination";

export const metadata: Metadata = { title: "Attendee registration | Aventix", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(typeof params.returnTo === "string" ? params.returnTo : undefined);
  return <AuthShell wide><AccountScreen returnTo={returnTo}><RegistrationForm returnTo={returnTo} /></AccountScreen></AuthShell>;
}
