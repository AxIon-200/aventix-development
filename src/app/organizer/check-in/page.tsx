import { CheckCircle2, Search, Camera } from "lucide-react";

export default function TicketScannerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Gate Check-In</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Ticket Scanner</h1>
          <p className="mt-1 text-sm text-slate-500">Validate attendee tickets and scan QR passes in real-time.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Scanner Viewport */}
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-[#111622] p-6 shadow-sm flex flex-col items-center justify-center min-h-[360px] text-center">
          <div className="relative flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-dashed border-teal-500/50 bg-[#0f141f]">
            <Camera className="h-10 w-10 text-teal-400/70 animate-pulse" />
            <div className="absolute inset-0 rounded-2xl ring-4 ring-teal-500/10 pointer-events-none" />
          </div>

          <p className="mt-4 text-sm font-medium text-white">Position Attendee QR Code in view</p>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Point your device camera at the ticket QR code. Real-time validation will check against Supabase tickets database.
          </p>

          {/* Manual Entry Fallback */}
          <div className="mt-6 flex w-full max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Or enter ticket code manually (e.g. TKT-9482)"
                className="w-full rounded-lg border border-white/10 bg-[#0f141f] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <button className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400">
              Validate
            </button>
          </div>
        </div>

        {/* Live Scan Log */}
        <div className="rounded-xl border border-white/10 bg-[#111622] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-white">Live Check-in Stream</h2>
          <p className="text-xs text-slate-400">Recent entries scanned at this gate</p>

          <div className="mt-4 space-y-3">
            {[
              { name: "Sherwin Cruz", ticket: "VIP Lounge", time: "Just now", status: "VALID" },
              { name: "Maria Santos", ticket: "General Admission", time: "2m ago", status: "VALID" },
              { name: "Jayson Dela Cruz", ticket: "Early Bird", time: "5m ago", status: "VALID" },
            ].map((scan, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0f141f] p-3"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-medium text-white">{scan.name}</p>
                    <p className="text-[11px] text-slate-400">{scan.ticket}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                    {scan.status}
                  </span>
                  <p className="mt-0.5 text-[10px] text-slate-500">{scan.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
