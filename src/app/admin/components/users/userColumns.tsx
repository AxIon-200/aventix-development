import { Eye } from "lucide-react";
import { ManagedUser, UserDecision } from "@/app/admin/types/users";
import { Column } from "@/app/admin/components/data-table/types";
import { Avatar } from "@/app/admin/components/ui/Avatar";
import { UserStatusBadge } from "@/app/admin/components/users/userStatus";
import { formatDate } from "@/app/admin/lib/format";

type Handlers = {
  onView: (user: ManagedUser) => void;
  onChangeStatus: (user: ManagedUser, next: UserDecision) => void;
};

export function getUserColumns({ onView, onChangeStatus }: Handlers): Column<ManagedUser>[] {
  return [
    {
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} src={u.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{u.name}</p>
            <p className="text-[11px] text-slate-500">{u.userCode}</p>
          </div>
        </div>
      ),
    },
    { header: "Email", className: "max-w-[240px] truncate", render: (u) => u.email },
    { header: "Status", render: (u) => <UserStatusBadge status={u.status} /> },
    { header: "Date Joined", className: "text-slate-400", render: (u) => formatDate(u.joinedAt) },
    {
      header: "Actions",
      align: "right",
      render: (u) => (
        <div className="flex items-center justify-end gap-2">
          {u.status !== "active" && (
            <button
              onClick={() => onChangeStatus(u, "active")}
              className="rounded-md bg-teal-500/10 px-2.5 py-1 text-xs font-medium text-teal-300 hover:bg-teal-500/20"
            >
              Activate
            </button>
          )}
          {u.status !== "inactive" && (
            <button
              onClick={() => onChangeStatus(u, "inactive")}
              className="rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
            >
              Deactivate
            </button>
          )}
          <button
            onClick={() => onView(u)}
            aria-label={`View ${u.name}`}
            title="View details"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];
}
