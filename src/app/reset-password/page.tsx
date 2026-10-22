import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import PasswordResetForm from "@/components/auth/PasswordResetForm";
import { safeReturnTo } from "@/lib/auth/destination";

export const metadata: Metadata = { title: "Reset password | Aventix", referrer: "no-referrer", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(typeof params.returnTo === "string" ? params.returnTo : undefined);
  return <AuthShell><PasswordResetForm returnTo={returnTo} /></AuthShell>;
}
