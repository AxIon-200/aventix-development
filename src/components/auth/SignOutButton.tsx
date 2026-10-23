"use client";
import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authErrorMessage, publicAuthClient } from "@/lib/auth/client";
import { authHref } from "@/lib/auth/destination";

/** Shared-auth integration only; the surrounding teammate page retains its layout. */
export default function SignOutButton({ children, className, title, switchAccount = false, returnTo, onStart, onFailure, onBeforeSignOut }: {
  children: ReactNode; className?: string; title?: string; switchAccount?: boolean; returnTo?: string;
  onStart?: () => void; onFailure?: () => void; onBeforeSignOut?: () => boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const router = useRouter();
  async function signOut() {
    if (busy.current || !publicAuthClient.logout || onBeforeSignOut?.() === false) return;
    busy.current = true; setPending(true); setError("");
    onStart?.();
    try {
      await publicAuthClient.logout();
      router.replace(switchAccount ? authHref("/login", returnTo) : "/"); router.refresh();
    } catch (cause) { onFailure?.(); setError(authErrorMessage(cause)); }
    finally { busy.current = false; setPending(false); }
  }
  return <>
    <button type="button" title={title} aria-label={pending ? "Signing out…" : title} aria-busy={pending} disabled={pending} onClick={signOut} className={`${className ?? ""} disabled:cursor-wait disabled:opacity-50`}>{children}</button>
    {error && <p role="alert" className="mt-2 max-w-full break-words px-2 text-xs text-red-300">{error}</p>}
  </>;
}
