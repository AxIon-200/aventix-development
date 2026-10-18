"use client";
import Link from "next/link";
import Dialog from "./auth/Dialog";
import { submitClass } from "./auth/FormField";

export default function OrganizerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return <Dialog open={isOpen} onClose={onClose} title="Organizer applications">
    <p className="my-6 text-sm text-[#c5c6c7]">Applications are awaiting the team’s onboarding policy. No application has been submitted.</p>
    <Link href="/register/organizer" className={submitClass}>View form preview</Link>
  </Dialog>;
}
