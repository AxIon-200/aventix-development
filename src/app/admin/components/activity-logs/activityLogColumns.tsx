import { Eye } from "lucide-react";
import { ActivityLog } from "@/app/admin/types/activity-logs";
import { Column } from "@/app/admin/components/data-table/types";
import {
  ACTOR_ROLE_LABEL,
  LOG_CATEGORY_LABEL,
  LogResultBadge,
} from "@/app/admin/components/activity-logs/activityLogStatus";
import { formatDateTime } from "@/app/admin/lib/dateTime";

type Handlers = {
  onView: (log: ActivityLog) => void;
};

export function getActivityLogColumns({ onView }: Handlers): Column<ActivityLog>[] {
  return [
    {
      header: "Timestamp",
      render: (l) => (
        <div className="whitespace-nowrap">
          <p className="text-slate-200">{formatDateTime(l.occurredAt)}</p>
          <p className="text-[11px] text-slate-500">{l.logCode}</p>
        </div>
      ),
    },
    {
      header: "Actor",
      render: (l) => (
        <div className="min-w-0 max-w-[180px]">
          <p className="truncate text-slate-200">{l.actorName}</p>
          <p className="text-[11px] text-slate-500">{ACTOR_ROLE_LABEL[l.actorRole]}</p>
        </div>
      ),
    },
    {
      header: "Action",
      className: "max-w-[220px]",
      render: (l) => <span className="font-medium text-white">{l.action}</span>,
    },
    { header: "Target", className: "max-w-[240px] truncate text-slate-400", render: (l) => l.targetLabel },
    { header: "Category", render: (l) => LOG_CATEGORY_LABEL[l.category] },
    { header: "Result", render: (l) => <LogResultBadge result={l.result} /> },
    {
      header: "Actions",
      align: "center",
      render: (l) => (
        <button
          onClick={() => onView(l)}
          aria-label={`View log ${l.logCode}`}
          title="View details"
          className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];
}
