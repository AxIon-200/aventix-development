"use client";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { DateTimePicker } from "@/components/shared/date-picker";
import OrganizerFeedback from "../OrganizerFeedback";
import { useOrganizerData } from "../useOrganizerData";
import { manilaInput, manilaTimestamp, organizerErrorMessage, organizerRequest, uploadOrganizerPoster } from "@/lib/organizer";
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
  const [showTiers, setShowTiers] = useState(false);
  const [date, setDate] = useState(manilaInput(initial?.startsAt ?? null));
  const [busy, setBusy] = useState(false), saving = useRef(false);
  const [message, setMessage] = useState(""), [error, setError] = useState("");
  const [imageVersion, setImageVersion] = useState(0);
  async function uploadPoster(file?: File) {
    if (!file || !saved || busy) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > 3 * 1024 * 1024) {
      setError("Choose a JPEG, PNG, or WebP image under 3 MB."); return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await uploadOrganizerPoster<OrganizerEventDraft>(saved.id, file, saved.updatedAt);
      setSaved(result); setImageVersion(value => value + 1); setMessage("Poster uploaded.");
    } catch (failure) { setError(organizerErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <><form className="space-y-6 rounded-xl border border-white/10 bg-[#111622] p-6" onSubmit={async event => {
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
      <button type="button" disabled={!saved} onClick={() => setShowTiers(true)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-50">Continue to Ticket Tiers</button></div>
    {!saved && <p className="text-xs text-slate-400">Save the event details before adding ticket tiers.</p>}
  </form>
    {saved && <section className="space-y-4 rounded-xl border border-white/10 bg-[#111622] p-6" aria-label="Event poster">
      <div><h2 className="text-xl font-semibold text-white">Event poster</h2><p className="mt-1 text-sm text-slate-400">Upload a JPEG, PNG, or WebP poster up to 3 MB. It will appear on event cards and the event page.</p></div>
      <label className="block max-w-lg space-y-2 text-sm text-slate-300">Poster image
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className={fieldClass}
          onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void uploadPoster(file); }} />
      </label>
      {saved.posterUrl && <div className="relative h-64 max-w-lg overflow-hidden rounded-lg bg-[#0f141f]">
        <Image src={saved.posterUrl === `/api/v1/events/${saved.id}/images/poster`
          ? `/api/v1/organizer/events/${saved.id}/images/poster?v=${imageVersion}` : saved.posterUrl}
          alt="Poster preview" fill unoptimized sizes="(max-width: 640px) 100vw, 512px" className="object-contain" />
      </div>}
    </section>}
    {saved && showTiers && <TicketTiers key={saved.id} event={saved} onChange={setSaved} />}
  </>;
}
function TicketTiers({ event, onChange }: { event: OrganizerEventDraft; onChange: (event: OrganizerEventDraft) => void }) {
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""), [error, setError] = useState("");
  const tier = event.tiers.find(item => item.id === selected);
  const editable = event.status === "DRAFT";
  async function submitTier(form: HTMLFormElement) {
    const fields = new FormData(form);
    const price = Number(fields.get("price")), maxCapacity = Number(fields.get("maxCapacity"));
    if (Math.abs(price * 100 - Math.round(price * 100)) >= 0.000001 || price <= 0 || !Number.isInteger(maxCapacity) || maxCapacity < 1) {
      setError("Enter a positive price in pesos and a capacity of at least one."); return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await organizerRequest<OrganizerEventDraft>(tier ? `/events/${event.id}/tiers/${tier.id}` : `/events/${event.id}/tiers`,
        { method: tier ? "PATCH" : "POST", body: { name: String(fields.get("name")), description: String(fields.get("description")),
          price, maxCapacity, status: String(fields.get("status")), expectedUpdatedAt: event.updatedAt } });
      onChange(result); setSelected(""); setMessage("Ticket tier saved.");
    } catch (failure) { setError(organizerErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function publish() {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await organizerRequest<OrganizerEventDraft>(`/events/${event.id}/publish`,
        { method: "POST", body: { expectedUpdatedAt: event.updatedAt } });
      onChange(result); setMessage("Event published. Its public page and active ticket tiers are now available.");
    } catch (failure) { setError(organizerErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5 rounded-xl border border-white/10 bg-[#111622] p-6" aria-label="Ticket tiers and publishing">
    <div><h2 className="text-xl font-semibold text-white">Ticket tiers</h2><p className="mt-1 text-sm text-slate-400">Create general admission tiers with a price in PHP and a ticket capacity.</p></div>
    {event.tiers.length > 0 && <div className="space-y-2">{event.tiers.map(item => <button key={item.id} type="button"
      onClick={() => setSelected(item.id)} className={`block w-full rounded-lg border p-3 text-left text-sm ${selected === item.id ? "border-teal-400" : "border-white/10"}`}>
      <span className="font-medium text-white">{item.name}</span><span className="ml-3 text-slate-400">₱{item.price.toFixed(2)} · {item.maxCapacity ?? "No"} tickets · {item.status === "ACTIVE" ? "Active" : "Disabled"}{item.admissionMode === "ASSIGNED_SEATING" ? " · Assigned seating" : ""}</span>
    </button>)}</div>}
    {editable && <><button type="button" onClick={() => setSelected("")} className="text-sm text-teal-300">+ Add ticket tier</button>
      {(!tier || tier.admissionMode === "GENERAL_ADMISSION") && <form key={selected || "new"} onSubmit={event => { event.preventDefault(); void submitTier(event.currentTarget); }} className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">Tier name<input name="name" required maxLength={150} defaultValue={tier?.name ?? ""} className={fieldClass} /></label>
        <label className="space-y-2 text-sm text-slate-300">Price (PHP)<input name="price" type="number" required min="0.01" max="9999999999.99" step="0.01" defaultValue={tier?.price ?? ""} className={fieldClass} /></label>
        <label className="space-y-2 text-sm text-slate-300">Ticket capacity<input name="maxCapacity" type="number" required min="1" max="1000000" step="1" defaultValue={tier?.maxCapacity ?? ""} className={fieldClass} /></label>
        <label className="space-y-2 text-sm text-slate-300">Availability<select name="status" defaultValue={tier?.status ?? "ACTIVE"} className={fieldClass}><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option></select></label>
        <label className="space-y-2 text-sm text-slate-300 sm:col-span-2">Description<textarea name="description" rows={2} maxLength={1000} defaultValue={tier?.description ?? ""} className={fieldClass} /></label>
        <button disabled={busy} className="w-fit rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{tier ? "Save Tier" : "Add Tier"}</button>
      </form>}
      <div className="border-t border-white/10 pt-5"><button type="button" disabled={busy || !event.tiers.some(item => item.status === "ACTIVE")} onClick={() => void publish()}
        className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Publish Event</button>
        <p className="mt-2 text-xs text-slate-400">Publishing makes this event public. Ticket sales follow the event and tier availability. Save event details above before publishing.</p></div>
    </>}
    {!editable && <p className="text-sm text-slate-400">This event is {event.status.toLowerCase().replace("_", " ")}. Tier changes are available for drafts.</p>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-teal-300">{message}</p>}
  </section>;
}
