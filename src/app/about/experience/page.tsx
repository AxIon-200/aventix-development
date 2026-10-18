import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import AboutHero from "@/components/AboutHero";
export const metadata: Metadata = { title: "The Aventix experience | Aventix" };
export default function ExperiencePage() {
  return <PageShell><AboutHero /><div className="mx-auto max-w-[1440px] px-6 pb-12 lg:px-16"><Link href="/about" className="text-sm text-[#66fcf1]">Read our story →</Link></div></PageShell>;
}
