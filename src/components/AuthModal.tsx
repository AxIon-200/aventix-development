"use client";
import Link from "next/link";
import Dialog from "./auth/Dialog";
import { submitClass } from "./auth/FormField";
import { authHref } from "@/lib/auth/destination";

/** Compatibility entry for existing consumers; all credentials use shared pages. */
export default function AuthModal({ isOpen, initialMode = "login", onClose, returnTo }: { isOpen: boolean; initialMode?: "login" | "register"; onClose: () => void; returnTo?: string }) {
  return <Dialog open={isOpen} onClose={onClose} title="Log in to continue">
    <p className="my-6 text-sm text-[#c5c6c7]">Use your Aventix account to continue. Access is determined by the account service.</p>
    <Link className={submitClass} href={authHref(initialMode === "login" ? "/login" : "/register", returnTo)}>Continue to {initialMode === "login" ? "Login" : "Registration"}</Link>
  </Dialog>;
}
