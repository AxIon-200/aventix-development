import Link from "next/link";
import { authHref } from "@/lib/auth/destination";

export default function AccountChoice({ returnTo }: { returnTo?: string }) {
  return <>
    <h1 className="text-center text-[28px] font-semibold">Create your Aventix Account</h1>
    <p className="mt-3 text-center text-sm text-[#aeb6c2]">Choose how you will use Aventix.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {[{ name: "Attendee", form: "Registration Form", body: "Discover events, book tickets, and manage your bookings.", href: "/register/attendee" }, { name: "Organizer", form: "Application Form", body: "Create events, manage listings, and sell tickets after approval.", href: "/register/organizer" }].map(item => <Link key={item.name} href={authHref(item.href, returnTo)} className="rounded-[18px] border border-[#2c3644] bg-[#181f27] px-6 py-6 text-center shadow-[0_2px_0_#66fcf1] transition hover:border-[#66fcf1] hover:bg-[#142e30] focus-visible:border-[#66fcf1] focus-visible:bg-[#142e30]">
        <h2 className="text-[28px] font-semibold text-[#66fcf1]">{item.name}</h2><p className="mt-2 text-lg font-semibold">{item.form}</p><p className="mt-3 text-sm leading-5 text-[#aeb6c2]">{item.body}</p>
      </Link>)}
    </div>
    <p className="mt-7 text-center text-[13px] leading-5 text-[#9fa3a8]">Organizer onboarding is awaiting the team’s approved policy. The organizer form is a visual preview only.</p>
    <p className="mt-20 text-center text-[13px] text-[#aeb6c2]">Already have an account? <Link href={authHref("/login", returnTo)} className="hover:text-[#66fcf1]">Log in</Link></p>
  </>;
}
