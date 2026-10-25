"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import OrganizerFeedback from "../OrganizerFeedback";
import OrganizerEventCard from "../OrganizerEventCard";
import { useOrganizerData } from "../useOrganizerData";
import type { OrganizerEventSummary } from "@/types/organizer";
export default function OrganizerEventsPage() {
  const params = useSearchParams(), router = useRouter();
  const search = params.get("search") ?? "", status = params.get("status") ?? "";
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  if (status) query.set("status", status);
  const state = useOrganizerData<OrganizerEventSummary[]>(`/events?${query}`);
  return <div className="space-y-6">
    <header className="flex items-center justify-between"><h1 className="text-2xl font-semibold text-white">My Events</h1><Link href="/organizer/events/new" className="text-teal-300 underline">Create New Event</Link></header>
    <form key={`${search}:${status}`} className="flex flex-wrap gap-3" onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget), next = new URLSearchParams();
      for (const field of ["search", "status"]) { const value = String(form.get(field) ?? "").trim(); if (value) next.set(field, value); }
      router.push(`/organizer/events?${next}`);
    }}>
      <input aria-label="Search your events" name="search" defaultValue={search} maxLength={200} placeholder="Search title or venue" className="rounded-lg border border-white/10 bg-[#111622] p-2 text-sm text-white" />
      <select aria-label="Event status" name="status" defaultValue={status} className="rounded-lg border border-white/10 bg-[#111622] p-2 text-sm text-white">
        <option value="">All statuses</option>{["DRAFT", "PUBLISHED", "SOLD_OUT", "COMPLETED", "CANCELLED"].map(value => <option key={value}>{value}</option>)}
      </select><button className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950">Search / Filter</button>
    </form>
    <OrganizerFeedback {...state} />
    {state.data && (state.data.length ? <div className="grid gap-4 lg:grid-cols-2">{state.data.map(event => <OrganizerEventCard key={event.id} event={event} />)}</div> : <p className="text-sm text-slate-400">No events match these filters.</p>)}
  </div>;
}
