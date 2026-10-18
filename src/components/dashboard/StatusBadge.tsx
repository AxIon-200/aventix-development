import type { TicketStatus } from "@/lib/dashboard";

const styles: Record<TicketStatus, string> = {
  confirmed: "bg-[#10b981]/[0.12] text-[#10b981]",
  pending: "bg-[#fabf24]/15 text-[#fabf24]",
  cancelled: "bg-red-500/15 text-red-400",
};

const labels: Record<TicketStatus, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
