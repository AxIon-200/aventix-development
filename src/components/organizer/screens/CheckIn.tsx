"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { OrganizerClientError, organizerDate, organizerErrorMessage, organizerRequest } from "@/lib/organizer";
import type { OrganizerCheckIn, OrganizerScan } from "@/types/organizer";
type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorConstructor = { new (options: { formats: string[] }): Detector };
const messages: Record<OrganizerScan["result"], string> = { VALID: "VALID — admission recorded.", ALREADY_USED: "ALREADY_USED — this ticket has already been admitted.", CANCELLED: "CANCELLED — do not admit.", EXPIRED: "EXPIRED — do not admit.", INVALID: "INVALID — do not admit." };
export default function TicketScannerPage() {
  const [entries, setEntries] = useState<OrganizerCheckIn[] | null>(null);
  const [error, setError] = useState(""), [result, setResult] = useState<OrganizerScan | null>(null);
  const [camera, setCamera] = useState(false), [cameraError, setCameraError] = useState("");
  const [busy, setBusy] = useState(false), [revision, setRevision] = useState(0), [blocked, setBlocked] = useState(false);
  const scanning = useRef(false), alive = useRef(true), video = useRef<HTMLVideoElement>(null);
  const requests = useRef(new Set<AbortController>());
  useEffect(() => { const pending = requests.current; alive.current = true; return () => { alive.current = false; for (const controller of pending) controller.abort(); }; }, []);
  const reject = useCallback((failure: unknown) => {
    if (failure instanceof OrganizerClientError && failure.accessRejected) { setBlocked(true); setCamera(false); }
  }, []);
  useEffect(() => {
    if (blocked) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      if (document.visibilityState === "hidden") { timer = setTimeout(refresh, 10000); return; }
      try {
        const data = await organizerRequest<OrganizerCheckIn[]>("/check-ins", { signal: controller.signal });
        if (!controller.signal.aborted) { setEntries(data); setError(""); }
      } catch (failure) {
        if (!controller.signal.aborted) { setError(organizerErrorMessage(failure)); reject(failure); }
        if (failure instanceof OrganizerClientError && failure.accessRejected) return;
      }
      if (!controller.signal.aborted) timer = setTimeout(refresh, 10000);
    };
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [blocked, revision, reject]);
  const scan = useCallback(async (ticketCode: string) => {
    if (scanning.current || blocked || !ticketCode.trim()) return;
    scanning.current = true; setBusy(true); setError(""); setResult(null); setCamera(false);
    const controller = new AbortController(); requests.current.add(controller);
    try {
      const data = await organizerRequest<OrganizerScan>("/check-in", { method: "POST", body: { ticketCode }, signal: controller.signal });
      if (alive.current) { setResult(data); if (data.result === "VALID") setRevision(value => value + 1); }
    } catch (failure) { if (alive.current) { setError(organizerErrorMessage(failure)); reject(failure); } }
    finally { requests.current.delete(controller); scanning.current = false; if (alive.current) setBusy(false); }
  }, [blocked, reject]);
  useEffect(() => {
    if (!camera) return;
    let stopped = false, stream: MediaStream | undefined, timer: ReturnType<typeof setTimeout>;
    const stop = () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach(track => track.stop()); };
    const start = async () => {
      try {
        const Constructor = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
        if (!Constructor || !navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        const detector = new Constructor({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped) { stream.getTracks().forEach(track => track.stop()); return; }
        const element = video.current;
        if (!element) { stop(); return; }
        element.srcObject = stream; await element.play();
        const decode = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(element);
            if (stopped) return;
            if (codes[0]?.rawValue) { stop(); await scan(codes[0].rawValue); return; }
            timer = setTimeout(decode, 400);
          } catch { if (!stopped) { stop(); setCamera(false); setCameraError("Camera decoding failed. Enter the ticket code manually."); } }
        };
        await decode();
      } catch { if (!stopped) { stop(); setCamera(false); setCameraError("Camera access or QR decoding is unavailable in this browser. Enter the ticket code manually."); } }
    };
    void start(); return stop;
  }, [camera, scan]);
  return <div className="space-y-6"><header><h1 className="text-2xl font-semibold text-white">Ticket Scanner</h1><p className="mt-2 text-sm text-slate-400">Validate tickets across your organization&apos;s eligible events.</p></header>
    <div className="grid gap-6 lg:grid-cols-3"><section className="space-y-4 rounded-xl border border-white/10 bg-[#111622] p-6 lg:col-span-2">
      {camera && <video ref={video} muted playsInline className="max-h-80 w-full rounded-lg" aria-label="Ticket QR camera" />}
      <button disabled={busy || blocked} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-teal-300 disabled:opacity-50" onClick={() => { setCameraError(""); setCamera(value => !value); }}>{camera ? "Stop Camera" : "Start Camera"}</button>
      <p className="text-xs text-slate-400">Camera QR reading uses your device. Manual entry remains available.</p>
      {cameraError && <p role="status" className="text-sm text-amber-300">{cameraError}</p>}
      <form className="flex gap-2" onSubmit={event => { event.preventDefault(); void scan(String(new FormData(event.currentTarget).get("ticketCode") ?? "")); }}>
        <input name="ticketCode" aria-label="Ticket code" required maxLength={200} autoComplete="off" placeholder="AVX-..." disabled={busy || blocked} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0f141f] p-3 text-sm text-white" />
        <button disabled={busy || blocked} className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Validating…" : "Validate"}</button>
      </form>
      {result && <p role="status" className={`text-sm ${result.result === "VALID" ? "text-teal-300" : "text-amber-300"}`}>{messages[result.result]}{result.entry ? ` ${result.entry.name} · ${result.entry.tier}` : ""}</p>}
      {error && <p role="alert" className="text-sm text-red-300">{error} {!blocked && <button className="underline" onClick={() => setRevision(value => value + 1)}>Retry stream</button>}</p>}
    </section><section className="rounded-xl border border-white/10 bg-[#111622] p-5"><h2 className="font-semibold text-white">Live Check-in Stream</h2><p className="mt-1 text-xs text-slate-400">Recent successful entries by your account. Refreshes every 10 seconds while visible.</p>
      {!entries && !error && <p role="status" className="mt-4 text-sm text-slate-400">Loading entries…</p>}
      {entries?.length === 0 && <p className="mt-4 text-sm text-slate-400">No successful entries yet.</p>}
      {entries?.map(entry => <article key={entry.id} className="mt-3 rounded-lg bg-[#0f141f] p-3"><p className="text-sm text-white">{entry.name}</p><p className="text-xs text-slate-400">{entry.tier} · {organizerDate(entry.scannedAt)}</p><p className="text-xs text-teal-300">VALID</p></article>)}
    </section></div>
  </div>;
}
