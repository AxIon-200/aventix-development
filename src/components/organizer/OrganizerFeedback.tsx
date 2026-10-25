"use client";
export default function OrganizerFeedback({ loading, error, retry }: { loading: boolean; error?: string; retry: () => void }) {
  if (loading) return <p role="status" className="text-sm text-slate-400">Loading organizer data…</p>;
  if (error) return <div role="alert" className="rounded-xl border border-red-400/30 p-4 text-sm text-red-200">{error} <button onClick={retry} className="ml-2 underline">Retry</button></div>;
  return null;
}
