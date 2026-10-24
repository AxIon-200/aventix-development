"use client";

import Dialog from "./Dialog";
import { submitClass } from "./FormField";

export type OrganizerApplicationStatus = "pending" | "rejected";

export default function OrganizerStatusDialog({ status, onClose }: { status: OrganizerApplicationStatus | null; onClose: () => void }) {
  return <Dialog open={status !== null} onClose={onClose} title="Organizer application status">
    {status === "pending" ? <>
      <p className="mt-6 text-lg font-semibold text-amber-200">Being reviewed</p>
      <p className="mt-3 text-sm leading-6 text-[#c5c6c7]">Your email is verified, and your application is awaiting administrator approval. We&apos;ll email you when a decision is made.</p>
    </> : status === "rejected" ? <>
      <p className="mt-6 text-lg font-semibold text-red-200">Rejected</p>
      <p className="mt-3 text-sm leading-6 text-[#c5c6c7]">Your organizer application was rejected. Check the decision email for the reason. This decision is final for this account; you cannot revise or resubmit the application or register again with the same email.</p>
    </> : null}
    {status && <>
      <p className="mt-4 text-xs text-[#9fa3a8]">No login session was created.</p>
      <button type="button" onClick={onClose} className={`${submitClass} mt-6 w-full`}>Close</button>
    </>}
  </Dialog>;
}
