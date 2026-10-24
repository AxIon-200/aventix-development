"use client";
import Link from "next/link";
import Dialog from "./auth/Dialog";
import { submitClass } from "./auth/FormField";

export default function OrganizerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return <Dialog open={isOpen} onClose={onClose} title="Organizer applications">
    <p className="my-6 text-sm text-[#c5c6c7]">Create a separate organizer account, verify its email, and wait for administrator approval before logging in.</p>
    <Link href="/register/organizer" className={submitClass}>Apply as an organizer</Link>
  </Dialog>;
}
