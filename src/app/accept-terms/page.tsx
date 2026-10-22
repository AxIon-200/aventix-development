import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import TermsAcceptanceForm from "@/components/auth/TermsAcceptanceForm";
import { safeReturnTo } from "@/lib/auth/destination";
import { validEmail } from "@/lib/auth/validation";

export const metadata: Metadata = { title: "Accept current terms | Aventix", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[]; email?: string | string[] }> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(typeof params.returnTo === "string" ? params.returnTo : undefined);
  const suppliedEmail = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
  const email = suppliedEmail.length <= 254 && validEmail(suppliedEmail) ? suppliedEmail : undefined;
  return <AuthShell><TermsAcceptanceForm returnTo={returnTo} initialEmail={email} /></AuthShell>;
}
