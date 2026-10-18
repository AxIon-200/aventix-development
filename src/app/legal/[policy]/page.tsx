import { notFound } from "next/navigation";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
const policies: Record<string, string> = { terms: "Terms & Conditions", privacy: "Privacy Policy", refunds: "Refund Policy", cookies: "Cookie Policy", security: "Data Security" };
export default async function PolicyPage({ params }: { params: Promise<{ policy: string }> }) {
  const { policy } = await params;
  const title = policies[policy];
  if (!title) notFound();
  return <PageShell><section className="mx-auto max-w-3xl px-6 py-24"><p className="text-sm text-amber-200">POLICY NOT YET PUBLISHED</p><h1 className="mt-4 font-display text-4xl font-bold">{title}</h1><p className="mt-6 leading-7 text-[#c5c6c7]">The approved {title.toLowerCase()} has not been supplied for this frontend preview. This page does not establish legal terms or make refund, privacy, or security promises.</p><p className="mt-4 leading-7 text-[#c5c6c7]">Account creation must remain unavailable until approved terms and the account service are connected.</p><Link href="/contact" className="mt-8 inline-block rounded-full bg-[#66fcf1] px-6 py-3 font-semibold text-[#0b0c10]">Contact Aventix</Link></section></PageShell>;
}
