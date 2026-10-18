import Link from "next/link";
import { authHref } from "@/lib/auth/destination";

export default function BookingLoginNotice({ returnTo }: { returnTo: string }) {
  return <div className="flex flex-col gap-5 rounded-xl border border-[#1b4975] bg-[#0d2c56] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
    <div><h2 className="font-semibold">Log in to select tickets</h2><p className="mt-1 text-sm text-[#c8d8e8]">Ticket options are shown for reference. Sign in to continue with seat selection and checkout.</p></div>
    <Link href={authHref("/login", returnTo)} className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#66fcf1] px-12 py-3 text-sm font-bold text-[#0b0c10] hover:bg-[#8afff6]">LOG IN</Link>
  </div>;
}
