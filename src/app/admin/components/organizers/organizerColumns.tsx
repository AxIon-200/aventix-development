import { Eye } from "lucide-react";
import type { Organizer } from "@/app/admin/types/organizers";
import type { Column } from "@/app/admin/components/data-table/types";
import { OrganizerStatusBadge } from "@/app/admin/components/organizers/organizerStatus";

export function getOrganizerColumns(onView: (organizer: Organizer) => void): Column<Organizer>[] {
  return [
    { header: "Organization", render: o => <div><p className="font-medium text-white">{o.organizationName}</p><p className="text-xs text-slate-500">{o.applicantName}</p></div> },
    { header: "Email", className: "max-w-[240px] truncate", render: o => o.email },
    { header: "Status", render: o => <OrganizerStatusBadge status={o.status} /> },
    { header: "Events", align: "center", render: o => o.eventsCount },
    { header: "Actions", align: "center", render: o => <button onClick={() => onView(o)} title={`View ${o.organizationName}`} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5"><Eye className="inline h-4 w-4" /> <span className="text-xs">View details</span></button> },
  ];
}
