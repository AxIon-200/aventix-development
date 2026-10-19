import type { TicketStatus } from "@/lib/tickets";

const styles: Record<TicketStatus, string> = {
  VALID: "bg-emerald-500/10 text-emerald-400",
  USED: "bg-slate-500/20 text-slate-300",
  EXPIRED: "bg-amber-500/10 text-amber-400",
  CANCELLED: "bg-red-500/10 text-red-400",
};

const labels: Record<TicketStatus, string> = {
  VALID: "Valid",
  USED: "Used",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export default function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
