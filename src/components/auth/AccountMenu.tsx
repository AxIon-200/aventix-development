"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, UserRound } from "lucide-react";
import {
  authErrorMessage,
  type AccountSession,
  type PublicAuthClient,
} from "@/lib/auth/client";
import { safeLocalHref } from "@/lib/booking/rules";

export default function AccountMenu({
  session,
  client,
  onLoggedOut,
}: {
  session: AccountSession;
  client: PublicAuthClient;
  onLoggedOut: () => void;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const router = useRouter();
  async function logout() {
    if (busy.current || !client.logout) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await client.logout();
      onLoggedOut();
      router.replace("/");
      router.refresh();
    } catch (error) {
      setError(authErrorMessage(error));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <details
      className="relative min-w-0 rounded-xl border border-[#45a29e] bg-[#1f2833] text-sm text-[#66fcf1]"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.open = false;
          e.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4">
        <UserRound aria-hidden size={17} />
        <span className="max-w-36 truncate">Hi, {session.displayName}</span>
        <ChevronDown aria-hidden className="ml-auto" size={16} />
      </summary>
      <div className="absolute left-0 z-[60] xl:left-auto xl:right-0 mt-2 w-64 rounded-xl border border-[#2c3644] bg-[#151b23] p-3 shadow-2xl">
        {session.navigation
          ?.filter((item) => safeLocalHref(item.href))
          .map((item) => (
            <Link
              key={item.href}
              href={safeLocalHref(item.href)!}
              className="block rounded-lg px-3 py-3 text-[#c5c6c7] hover:bg-[#1f2833]"
            >
              {item.label}
            </Link>
          ))}
        <button
          type="button"
          onClick={logout}
          disabled={pending || !client.logout}
          className="w-full rounded-lg px-3 py-3 text-left text-red-300 hover:bg-red-400/10 disabled:opacity-50"
        >
          {pending ? "Signing out…" : "Log out"}
        </button>
        {!client.logout && (
          <p className="px-3 text-xs leading-5 text-[#9fa3a8]">
            Logout is unavailable until the session service is connected.
          </p>
        )}
        {error && (
          <p role="alert" className="p-3 text-xs text-red-200">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
