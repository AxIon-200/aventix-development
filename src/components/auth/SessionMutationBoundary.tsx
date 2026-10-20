"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import SignOutButton from "./SignOutButton";

/** Hide workspace content while a local sign-out cannot be confirmed.
 * General role/page authorization is delivered separately in S01.
 */
export default function SessionMutationBoundary({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail === "blocked") setBlocked(true);
      if (detail === "signed-out") setBlocked(false);
    };
    window.addEventListener("aventix:session-updated", update);
    return () => window.removeEventListener("aventix:session-updated", update);
  }, []);
  const workspace = /^\/(?:dashboard|organizer|admin|bookings)(?:\/|$)/.test(pathname ?? "")
    || /^\/events\/[^/]+\/(?:tickets|seats)$/.test(pathname ?? "");
  if (!blocked || !workspace) return children;
  return <main id="main-content" className="mx-auto max-w-xl space-y-6 px-6 py-24">
    <h1 className="text-2xl">Sign-out could not be confirmed</h1>
    <p role="alert">Protected content is unavailable until your sign-out is confirmed.</p>
    <SignOutButton className="text-[#66fcf1] underline">Retry sign-out</SignOutButton>
    <Link href="/events" className="block text-[#66fcf1] underline">Browse public events</Link>
  </main>;
}
