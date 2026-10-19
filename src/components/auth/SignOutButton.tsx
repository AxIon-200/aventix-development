"use client";
import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authErrorMessage, publicAuthClient } from "@/lib/auth/client";

/** Shared-auth integration only; the surrounding teammate page retains its layout. */
export default function SignOutButton({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const router = useRouter();
  async function signOut() {
    if (busy.current || !publicAuthClient.logout) return;
    busy.current = true; setPending(true); setError("");
    try {
      await publicAuthClient.logout();
      router.replace("/"); router.refresh();
    } catch (cause) { setError(authErrorMessage(cause)); }
    finally { busy.current = false; setPending(false); }
  }
  return <>
    <button type="button" title={title} aria-label={pending ? "Signing out…" : "Sign Out"} aria-busy={pending} disabled={pending} onClick={signOut} className={`${className ?? ""} disabled:cursor-wait disabled:opacity-50`}>{children}</button>
    {error && <p role="alert" className="mt-2 max-w-full break-words px-2 text-xs text-red-300">{error}</p>}
  </>;
}
