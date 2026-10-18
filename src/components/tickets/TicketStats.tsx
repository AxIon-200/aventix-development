import type { TicketGroups } from "@/lib/tickets";

export default function TicketStats({ groups }: { groups: TicketGroups }) {
  const total = groups.upcoming.length + groups.past.length + groups.cancelled.length;
  const used = groups.past.filter((t) => t.displayStatus === "USED").length;

  const items = [
    { label: "Total Tickets", value: total, note: "All time" },
    { label: "Active", value: groups.upcoming.length, note: "Ready to use" },
    { label: "Used", value: used, note: "Checked in" },
    { label: "Cancelled", value: groups.cancelled.length, note: "Not valid for entry" },
  ];

  return (
    <section aria-label="Ticket summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-white/10 bg-[#111622] p-5">
          <p className="text-[13px] font-medium text-slate-400">{item.label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
          <p className="mt-2 border-t border-white/10 pt-2 text-[11px] text-slate-500">{item.note}</p>
        </div>
      ))}
    </section>
  );
}
