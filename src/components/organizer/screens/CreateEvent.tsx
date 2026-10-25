"use client";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DateTimePicker } from "@/components/shared/date-picker";
import OrganizerFeedback from "../OrganizerFeedback";
import { useOrganizerData } from "../useOrganizerData";
import { manilaInput, manilaTimestamp, organizerErrorMessage, organizerRequest } from "@/lib/organizer";
import type { OrganizerEventDraft } from "@/types/organizer";
const fieldClass = "w-full rounded-lg border border-white/10 bg-[#0f141f] px-3.5 py-2.5 text-sm text-white";
export default function CreateEventPage() {
  const id = useSearchParams().get("eventId");
  const state = useOrganizerData<OrganizerEventDraft>(id ? `/events/${encodeURIComponent(id)}` : null);
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-semibold text-white">{id ? "Edit Event" : "Create New Event"}</h1><p className="mt-2 text-sm text-slate-400">Save event details. Date and time use Asia/Manila.</p></header>
    <OrganizerFeedback {...state} />
    {(!id || state.data) && <EventForm key={id ?? "new"} initial={state.data} />}
  </div>;
}
function EventForm({ initial }: { initial?: OrganizerEventDraft }) {
  const [saved, setSaved] = useState(initial);
  const [date, setDate] = useState(manilaInput(initial?.startsAt ?? null));
  const [busy, setBusy] = useState(false), saving = useRef(false);
  const [message, setMessage] = useState(""), [error, setError] = useState("");
  return <form className="space-y-6 rounded-xl border border-white/10 bg-[#111622] p-6" onSubmit={async event => {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const body = { title: String(form.get("title")), category: String(form.get("category")) || null, startsAt: manilaTimestamp(date), venueText: String(form.get("venueText")), description: String(form.get("description")), ...(saved ? { expectedUpdatedAt: saved.updatedAt } : {}) };
      const result = await organizerRequest<OrganizerEventDraft>(saved ? `/events/${saved.id}` : "/events", { method: saved ? "PATCH" : "POST", body });
      setSaved(result); setMessage("Event saved.");
      window.history.replaceState(null, "", `/organizer/events/new?eventId=${encodeURIComponent(result.id)}`);
    } catch (failure) { setError(organizerErrorMessage(failure)); }
    finally { saving.current = false; setBusy(false); }
  }}>
    <fieldset disabled={busy} className="grid gap-6 sm:grid-cols-2">
      <label className="space-y-2 text-sm text-slate-300">Event Title<input name="title" required maxLength={200} defaultValue={initial?.title ?? ""} className={fieldClass} /></label>
      <label className="space-y-2 text-sm text-slate-300">Category<select name="category" defaultValue={initial?.category ?? ""} className={fieldClass}><option value="">Not set</option>{["Concert", "Gig", "Festival", "Conference", "Sports", "Theater"].map(value => <option key={value}>{value}</option>)}</select></label>
      <div className="space-y-2 text-sm text-slate-300"><label htmlFor="organizer-event-date-trigger">Event Date & Time (Manila)</label><DateTimePicker id="organizer-event-date" value={date} onChange={setDate} placeholder="Select date & start time" disabled={busy} /></div>
      <label className="space-y-2 text-sm text-slate-300">Venue & City<input name="venueText" maxLength={300} defaultValue={initial?.venueText ?? ""} className={fieldClass} /></label>
      <label className="space-y-2 text-sm text-slate-300 sm:col-span-2">Event Description<textarea name="description" rows={4} maxLength={10000} defaultValue={initial?.description ?? ""} className={fieldClass} /></label>
    </fieldset>
    {saved && <p className="text-xs text-slate-400">Status: {saved.status}. Saving preserves this status.</p>}
    {error && <p role="alert" className="text-sm text-red-300">{error} <button type="button" className="underline" onClick={() => window.location.reload()}>Reload event</button></p>}
    {message && <p role="status" className="text-sm text-teal-300">{message}</p>}
    <div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Saving…" : saved && saved.status !== "DRAFT" ? "Save Changes" : "Save as Draft"}</button>
      <button type="button" disabled title="Ticket-tier editing is not available yet" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-500">Continue to Ticket Tiers</button></div>
    <p className="text-xs text-slate-400">Ticket-tier editing and organizer publishing are not available yet. Saving does not publish an event or create tickets.</p>
  </form>;
}
