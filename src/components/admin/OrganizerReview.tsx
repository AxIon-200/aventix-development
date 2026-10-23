"use client";

import { useEffect, useState, type FormEvent } from "react";

type ReviewStatus = "awaiting-verification" | "pending" | "approved" | "rejected" | "suspended";
type DecisionStatus = "APPROVED" | "REJECTED" | "SUSPENDED";
type EmailStatus = "PENDING" | "SENDING" | "ACCEPTED" | "FAILED" | "UNCERTAIN" | "SUPERSEDED";
type Row = { id: string; organizationName: string; applicantName: string; email: string;
  status: ReviewStatus; version: number; submittedAt: string | null; eventsCount: number };
type Stats = { total: number; awaitingVerification: number; pending: number; approved: number;
  rejected: number; suspended: number };
type Decision = { id: string; actorId: string; previousStatus: string; resultingStatus: string;
  reason: string | null; version: number; decidedAt: string; emailStatus: EmailStatus; emailAttempts: number };
type Application = { firstName: string; lastName: string; email: string; phoneNumber: string | null;
  organizationName: string; organizationDescription: string; submittedAt: string;
  termsVersion: string };
type Detail = { id: string; organizationName: string; status: ReviewStatus; version: number;
  currentContact: { firstName: string; lastName: string; email: string; phoneNumber: string | null;
    emailVerified: boolean; status: string }; application: Application | null;
  decisions: Decision[]; recentEvents: { id: string; name: string; status: string;
    eventDate: string | null; createdAt: string }[] };

class ReviewRequestError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

const base = "/api/v1/admin/organizers";
const filters: { value: ReviewStatus | "all"; label: string; count: keyof Stats }[] = [
  { value: "all", label: "All", count: "total" },
  { value: "awaiting-verification", label: "Awaiting email verification", count: "awaitingVerification" },
  { value: "pending", label: "Pending review", count: "pending" },
  { value: "approved", label: "Approved", count: "approved" },
  { value: "rejected", label: "Rejected", count: "rejected" },
  { value: "suspended", label: "Suspended", count: "suspended" },
];

async function reviewRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { ...init, credentials: "include", cache: "no-store",
      redirect: "error", headers: { Accept: "application/json", ...init?.headers },
      signal: AbortSignal.timeout(15000) });
  } catch { throw new ReviewRequestError(0, "REQUEST_UNCERTAIN", "The request could not be confirmed. Refresh before trying another decision."); }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = typeof body?.error?.code === "string" ? body.error.code : "UNAVAILABLE";
    const message = response.status === 409 ? "This record changed. Refresh its details before deciding again."
      : response.status === 401 || response.status === 403 ? "Administrator access is required. Refresh your account or log in again."
        : typeof body?.error?.message === "string" ? body.error.message : "The request failed. Please try again.";
    throw new ReviewRequestError(response.status, code, message);
  }
  if (!body || typeof body !== "object" || !("data" in body)) {
    throw new ReviewRequestError(response.status, "INVALID_RESPONSE", "The service returned an invalid response.");
  }
  return body as T;
}

function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Unavailable";
}

function actionsFor(status: ReviewStatus): { status: DecisionStatus; label: string; reason: boolean }[] {
  if (status === "pending") return [
    { status: "APPROVED", label: "Approve", reason: false },
    { status: "REJECTED", label: "Reject", reason: true },
  ];
  if (status === "approved") return [{ status: "SUSPENDED", label: "Suspend", reason: true }];
  if (status === "suspended") return [{ status: "APPROVED", label: "Reinstate", reason: false }];
  return [];
}

export default function OrganizerReview() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReviewStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [action, setAction] = useState<DecisionStatus | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);
    const statsParams = new URLSearchParams();
    if (search) statsParams.set("search", search);
    Promise.all([
      reviewRequest<{ data: Row[]; total: number }>(`?${params}`),
      reviewRequest<{ data: Stats }>(`/stats?${statsParams}`),
    ]).then(([list, counts]) => {
      if (cancelled) return;
      setRows(list.data);
      setTotal(list.total);
      setStats(counts.data);
    }).catch((cause: Error) => { if (!cancelled) setError(cause.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, status, page, revision]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    reviewRequest<{ data: Detail }>(`/${selectedId}`)
      .then(result => { if (!cancelled) setDetail(result.data); })
      .catch((cause: Error) => { if (!cancelled) setDetailError(cause.message); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId, revision]);

  const refresh = () => {
    setLoading(true);
    setError("");
    if (selectedId) {
      setDetail(null);
      setDetailError("");
      setDetailLoading(true);
    }
    setRevision(value => value + 1);
  };
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearch = String(new FormData(event.currentTarget).get("search") ?? "").trim();
    if (nextSearch === search && page === 1) { refresh(); return; }
    setLoading(true);
    setError("");
    setPage(1);
    setSearch(nextSearch);
  };
  const decide = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail || !action) return;
    const trimmed = reason.trim();
    if ((action === "REJECTED" || action === "SUSPENDED") && (!trimmed || [...trimmed].length > 500)) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await reviewRequest<{ data: { emailStatus: EmailStatus } }>(`/${detail.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, version: detail.version, ...(trimmed ? { reason: trimmed } : {}) }),
      });
      setNotice(result.data.emailStatus === "ACCEPTED" ? "Decision saved and email accepted by the provider."
        : "Decision saved. Email delivery needs attention; check the decision history.");
      setAction(null);
      setReason("");
      refresh();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "The decision could not be confirmed. Refresh the record.");
      if (cause instanceof ReviewRequestError && (cause.status === 409 || cause.code === "REQUEST_UNCERTAIN")) refresh();
    } finally { setBusy(false); }
  };
  const retryEmail = async (decisionId: string) => {
    if (!detail) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await reviewRequest<{ data: { emailStatus: EmailStatus } }>(
        `/${detail.id}/decisions/${decisionId}/retry-email`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
        });
      setNotice(`Email status: ${result.data.emailStatus.toLowerCase()}.`);
      refresh();
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Email retry could not be confirmed."); refresh(); }
    finally { setBusy(false); }
  };
  const exportCsv = async () => {
    setNotice("");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);
    try {
      const response = await fetch(`${base}/export?${params}`, { credentials: "include", cache: "no-store",
        redirect: "error", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("Could not export organizers. Refresh your account and try again.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "organizers.csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Could not export organizers."); }
  };

  return <section aria-label="Organizer review" className="space-y-6 rounded-2xl border border-slate-700 bg-[#151b23] p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Organizer applications</h2>
        <p className="text-sm text-slate-300">Review verified applicants and manage organization access.</p></div>
      <button type="button" onClick={refresh} className="rounded border border-slate-500 px-3 py-2 text-sm">Refresh</button>
    </div>
    <form onSubmit={submitSearch} className="flex flex-wrap gap-2">
      <label htmlFor="organizer-search" className="sr-only">Search organization, applicant, or email</label>
      <input id="organizer-search" name="search"
        maxLength={100} placeholder="Search organization, applicant, or email"
        className="min-w-0 flex-1 rounded border border-slate-500 bg-slate-900 px-3 py-2 text-sm" />
      <button type="submit" className="rounded bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950">Search</button>
      <button type="button" onClick={exportCsv} className="rounded border border-slate-500 px-3 py-2 text-sm">Export CSV</button>
    </form>
    <div className="flex flex-wrap gap-2" aria-label="Status filters">
      {filters.map(filter => <button key={filter.value} type="button" aria-pressed={status === filter.value}
        onClick={() => { if (status === filter.value && page === 1) { refresh(); return; }
          setLoading(true); setError(""); setStatus(filter.value); setPage(1); }}
        className={`rounded border px-3 py-1.5 text-sm ${status === filter.value ? "border-teal-400 text-teal-300" : "border-slate-600 text-slate-300"}`}>
        {filter.label} {stats ? `(${stats[filter.count]})` : ""}
      </button>)}
    </div>
    {notice && <p role="status" className="rounded border border-amber-500/40 p-3 text-sm">{notice}</p>}
    {error ? <div role="alert" className="space-y-2"><p>{error}</p><button type="button" onClick={refresh} className="text-teal-300 underline">Retry</button></div>
      : loading ? <p role="status">Loading organizers…</p>
        : rows.length === 0 ? <p>No organizers match this search and filter.</p>
          : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm">
            <thead><tr className="border-b border-slate-600 text-slate-300"><th className="py-2">Organization</th><th>Applicant</th><th>Email</th><th>Status</th><th>Events</th><th>Action</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.id} className="border-b border-slate-700">
              <td className="py-3 font-medium">{row.organizationName}</td><td>{row.applicantName}</td><td>{row.email}</td>
              <td>{row.status.replaceAll("-", " ")}</td><td>{row.eventsCount}</td>
              <td><button type="button" onClick={() => { setSelectedId(row.id); setDetail(null); setDetailError(""); setDetailLoading(true); setAction(null); setNotice(""); }} className="text-teal-300 underline">View details</button></td>
            </tr>)}</tbody>
          </table></div>}
    <div className="flex items-center justify-between gap-3 text-sm">
      <span>{total} matching organizations · Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
      <div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => { setLoading(true); setError(""); setPage(value => value - 1); }} className="rounded border border-slate-500 px-3 py-1 disabled:opacity-50">Previous</button>
        <button type="button" disabled={page * pageSize >= total} onClick={() => { setLoading(true); setError(""); setPage(value => value + 1); }} className="rounded border border-slate-500 px-3 py-1 disabled:opacity-50">Next</button></div>
    </div>
    {selectedId && <section aria-label="Organizer details" className="space-y-5 border-t border-slate-600 pt-6">
      <div className="flex items-center justify-between gap-2"><h3 className="text-lg font-semibold">Application details</h3>
        <button type="button" onClick={() => { setSelectedId(null); setAction(null); }} className="text-teal-300 underline">Close details</button></div>
      {detailLoading ? <p role="status">Loading details…</p> : detailError ? <div role="alert"><p>{detailError}</p>
        <button type="button" onClick={refresh} className="text-teal-300 underline">Refresh details</button></div> : detail && <>
        <p className="text-sm">{detail.organizationName} · {detail.status.replaceAll("-", " ")} · Version {detail.version}</p>
        {detail.application ? <div className="space-y-2 rounded border border-slate-600 p-4 text-sm">
          <h4 className="font-semibold">Submitted application</h4>
          <p>{detail.application.firstName} {detail.application.lastName} · {detail.application.email}</p>
          <p>Phone: {detail.application.phoneNumber || "Not provided"}</p>
          <p>Organization: {detail.application.organizationName}</p>
          <p className="whitespace-pre-wrap">{detail.application.organizationDescription}</p>
          <p>Submitted: {date(detail.application.submittedAt)} · Terms version: {detail.application.termsVersion}</p>
        </div> : <p>This legacy organization has no saved application snapshot.</p>}
        <div className="text-sm"><h4 className="font-semibold">Current contact</h4>
          <p>{detail.currentContact.firstName} {detail.currentContact.lastName} · {detail.currentContact.email}</p>
          <p>Email verified: {detail.currentContact.emailVerified ? "Yes" : "No"} · Account: {detail.currentContact.status}</p></div>
        <div className="space-y-2"><h4 className="font-semibold">Recent owned events</h4>
          {detail.recentEvents.length === 0 ? <p className="text-sm">No events yet.</p> : <ul className="space-y-1 text-sm">
            {detail.recentEvents.map(event => <li key={event.id}>{event.name} · {event.status} · {date(event.eventDate)}</li>)}</ul>}</div>
        <div className="space-y-2"><h4 className="font-semibold">Decision history</h4>
          {detail.decisions.length === 0 ? <p className="text-sm">No decisions yet.</p> : <ul className="space-y-3">
            {detail.decisions.map(decision => <li key={decision.id} className="rounded border border-slate-600 p-3 text-sm">
              <p>{decision.previousStatus} → {decision.resultingStatus} · {date(decision.decidedAt)} · Version {decision.version}</p>
              {decision.reason && <p className="whitespace-pre-wrap">Reason: {decision.reason}</p>}
              <p>Email: {decision.emailStatus.toLowerCase()} · Attempts: {decision.emailAttempts}</p>
              {decision.version === detail.version && ["PENDING", "SENDING", "FAILED", "UNCERTAIN"].includes(decision.emailStatus)
                && <button type="button" disabled={busy} onClick={() => retryEmail(decision.id)} className="mt-1 text-teal-300 underline disabled:opacity-50">Retry decision email</button>}
            </li>)}</ul>}</div>
        {actionsFor(detail.status).length > 0 && <div className="space-y-3 border-t border-slate-600 pt-4">
          <h4 className="font-semibold">Administrator decision</h4>
          {actionsFor(detail.status).map(option => <button key={option.label} type="button"
            onClick={() => { setAction(option.status); setReason(""); }} disabled={busy}
            className="mr-2 rounded border border-teal-400 px-3 py-2 text-sm text-teal-300 disabled:opacity-50">{option.label}</button>)}
          {action && <form onSubmit={decide} className="space-y-3 rounded border border-slate-600 p-4">
            <p>{action === "APPROVED" ? detail.status === "suspended" ? "Reinstate this organization? A fresh login will be required." : "Approve this application?"
              : action === "REJECTED" ? "Reject this application permanently?" : "Suspend organizer access? Existing sessions will end."}</p>
            {(action === "REJECTED" || action === "SUSPENDED") && <div className="space-y-1"><label htmlFor="decision-reason">Reason shown to the organizer</label>
              <textarea id="decision-reason" name="reason" required value={reason} onChange={event => setReason(event.target.value)}
                rows={3} className="block w-full rounded border border-slate-500 bg-slate-900 p-2 text-sm" />
              <p className="text-xs">{[...reason.trim()].length}/500 characters</p></div>}
            <div className="flex gap-2"><button type="submit" disabled={busy || ((action === "REJECTED" || action === "SUSPENDED") && (![...reason.trim()].length || [...reason.trim()].length > 500))}
              className="rounded bg-teal-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50">{busy ? "Saving…" : "Confirm decision"}</button>
              <button type="button" disabled={busy} onClick={() => setAction(null)} className="rounded border border-slate-500 px-3 py-2 text-sm">Cancel</button></div>
          </form>}
        </div>}
      </>}
    </section>}
  </section>;
}
