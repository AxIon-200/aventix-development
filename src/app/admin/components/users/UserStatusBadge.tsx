import { UserStatus } from "@/app/admin/types/users";

const STYLES: Record<UserStatus, { label: string; badge: string; dot: string }> = {
  active: {
    label: "Active",
    badge: "border-teal-400/30 bg-teal-500/10 text-teal-300",
    dot: "bg-teal-400",
  },
  inactive: {
    label: "Inactive",
    badge: "border-red-400/30 bg-red-500/10 text-red-300",
    dot: "bg-red-400",
  },
  pending: {
    label: "Pending",
    badge: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
  },
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${s.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
