import { Check, Eye, X } from "lucide-react";
import { Organizer, OrganizerDecision } from "@/app/admin/types/organizers";
import { Column } from "@/app/admin/components/data-table/types";
import { Avatar } from "@/app/admin/components/ui/Avatar";
import { OrganizerStatusBadge } from "@/app/admin/components/organizers/organizerStatus";

type Handlers = {
  onView: (organizer: Organizer) => void;
  onDecide: (organizer: Organizer, decision: OrganizerDecision) => void;
};

const iconBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 transition-colors disabled:cursor-not-allowed disabled:opacity-30";

export function getOrganizerColumns({ onView, onDecide }: Handlers): Column<Organizer>[] {
  return [
    {
      header: "Organizer",
      render: (o) => (
        <div className="flex items-center gap-3">
          <Avatar name={o.name} src={o.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{o.name}</p>
            <p className="text-[11px] text-slate-500">{o.organizerCode}</p>
          </div>
        </div>
      ),
    },
    { header: "Email", className: "max-w-[240px] truncate", render: (o) => o.email },
    { header: "Status", render: (o) => <OrganizerStatusBadge status={o.status} /> },
    {
      header: "Events",
      align: "center",
      render: (o) => (
        <span className="font-medium text-white">
          {o.eventsCount} {o.eventsCount === 1 ? "event" : "events"}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "center",
      render: (o) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onView(o)}
            aria-label={`View ${o.name}`}
            title="View details"
            className={`${iconBtn} text-slate-400 hover:bg-white/5 hover:text-white`}
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDecide(o, "approved")}
            disabled={o.status === "approved"}
            aria-label={`Approve ${o.name}`}
            title="Approve"
            className={`${iconBtn} text-teal-300 hover:bg-teal-500/10`}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDecide(o, "rejected")}
            disabled={o.status === "rejected"}
            aria-label={`Reject ${o.name}`}
            title="Reject"
            className={`${iconBtn} text-rose-300 hover:bg-rose-500/10`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];
}
