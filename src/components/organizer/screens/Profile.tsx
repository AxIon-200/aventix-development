"use client";
import { useRef, useState } from "react";
import OrganizerFeedback from "../OrganizerFeedback";
import { useOrganizerData } from "../useOrganizerData";
import { organizerErrorMessage, organizerRequest } from "@/lib/organizer";
import type { OrganizerProfile } from "@/types/organizer";
const fieldClass = "mt-2 w-full rounded-lg border border-white/10 bg-[#0f141f] p-3 text-sm text-white";
export default function OrganizerProfilePage() {
  const state = useOrganizerData<OrganizerProfile>("/profile");
  return <div className="space-y-6"><h1 className="text-2xl font-semibold text-white">Organizer Profile & Payouts</h1><OrganizerFeedback {...state} />
    {state.data && <ProfileForm initial={state.data} />}
  </div>;
}
function ProfileForm({ initial }: { initial: OrganizerProfile }) {
  const [profile, setProfile] = useState(initial), [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  return <form className="space-y-5 rounded-xl border border-white/10 bg-[#111622] p-6" onSubmit={async event => {
    event.preventDefault(); if (saving.current) return;
    const element = event.currentTarget, form = new FormData(element);
    const bankName = String(form.get("bankName") ?? "").trim(), accountNumber = String(form.get("accountNumber") ?? "");
    setMessage(""); setError("");
    if ((accountNumber && !bankName) || (!accountNumber && bankName !== profile.bankName)) { setError("Enter both bank name and account number to replace bank details."); return; }
    saving.current = true; setBusy(true);
    try {
      const result = await organizerRequest<OrganizerProfile>("/profile", { method: "PATCH", body: {
        organizationName: String(form.get("organizationName")), contactEmail: String(form.get("contactEmail")), bio: String(form.get("bio")),
        ...(accountNumber ? { bankName, accountNumber } : {}),
      } });
      setProfile(result);
      (element.elements.namedItem("accountNumber") as HTMLInputElement).value = "";
      setMessage("Profile saved.");
    } catch (failure) { setError(organizerErrorMessage(failure)); }
    finally { saving.current = false; setBusy(false); }
  }}>
    <p className="text-sm text-teal-300">Organization approval: {profile.approvalStatus}</p>
    <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm text-slate-300">Organization Name<input name="organizationName" required minLength={2} maxLength={150} defaultValue={profile.organizationName} className={fieldClass} /></label>
      <label className="text-sm text-slate-300">Contact Email<input name="contactEmail" type="email" required maxLength={254} defaultValue={profile.contactEmail} className={fieldClass} /><span className="text-xs text-slate-400">Public organization contact. Your login email is unchanged.</span></label>
      <label className="text-sm text-slate-300 sm:col-span-2">Bio<textarea name="bio" rows={4} maxLength={2000} defaultValue={profile.bio} className={fieldClass} /></label>
      <label className="text-sm text-slate-300">Bank Name<input name="bankName" maxLength={150} defaultValue={profile.bankName} className={fieldClass} /></label>
      <label className="text-sm text-slate-300">Replacement Account Number<input name="accountNumber" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{4,34}" minLength={4} maxLength={34} placeholder="Leave blank to keep saved number" className={fieldClass} /></label>
    </fieldset>
    <p className="text-xs text-slate-400">Saved account: {profile.accountNumberMasked ?? "None"}. Leave the number blank to preserve saved details. Withdrawals, bank verification, and transfers are unavailable.</p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-teal-300">{message}</p>}
    <button disabled={busy} className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Saving…" : "Save Profile"}</button>
  </form>;
}
