export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info";

const TONES: Record<BadgeTone, { badge: string; dot: string }> = {
  success: { badge: "border-teal-400/30 bg-teal-500/10 text-teal-300", dot: "bg-teal-400" },
  warning: { badge: "border-amber-400/30 bg-amber-500/10 text-amber-300", dot: "bg-amber-400" },
  danger: { badge: "border-rose-400/30 bg-rose-500/10 text-rose-300", dot: "bg-rose-400" },
  neutral: { badge: "border-slate-400/20 bg-slate-500/10 text-slate-300", dot: "bg-slate-400" },
  info: { badge: "border-sky-400/30 bg-sky-500/10 text-sky-300", dot: "bg-sky-400" },
};

// Generic: each feature decides which label/tone belongs to which status.
export function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  const t = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${t.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {label}
    </span>
  );
}
