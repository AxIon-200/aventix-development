import { CalendarDays, Eye } from "lucide-react";
import { AdminEvent } from "@/app/admin/types/events";
import { Column } from "@/app/admin/components/data-table/types";
import { ALLOWED_TRANSITIONS, EventStatusBadge } from "@/app/admin/components/events/eventStatus";
import { formatDate } from "@/app/admin/lib/format";

type Handlers = {
  onView: (event: AdminEvent) => void;
  onManageAvailability: (event: AdminEvent) => void;
};

const iconBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:bg-white/5 hover:text-white";

export function getEventColumns({ onView, onManageAvailability }: Handlers): Column<AdminEvent>[] {
  return [
    {
      header: "Event",
      render: (e) => (
        <div className="min-w-0 max-w-[260px]">
          <p className="truncate font-medium text-white">{e.title}</p>
          <p className="text-[11px] text-slate-500">{e.eventCode}</p>
        </div>
      ),
    },
    { header: "Organizer", render: (e) => e.organizerName },
    {
      header: "Schedule",
      render: (e) => (
        <div>
          <p className="text-slate-200">{formatDate(e.startsAt)}</p>
          <p className="text-[11px] text-slate-500">{e.venue}</p>
        </div>
      ),
    },
    { header: "Status", render: (e) => <EventStatusBadge status={e.status} /> },
    {
      header: "Attendees",
      align: "center",
      render: (e) => <span className="font-medium text-white">{e.attendees.toLocaleString()}</span>,
    },
    {
      header: "Actions",
      align: "center",
      render: (e) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onView(e)}
            aria-label={`View ${e.title}`}
            title="View details"
            className={iconBtn}
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            disabled={ALLOWED_TRANSITIONS[e.status].length === 0}
            onClick={() => onManageAvailability(e)}
            aria-label={`Manage availability for ${e.title}`}
            title="Manage availability"
            className={iconBtn}
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];
}
