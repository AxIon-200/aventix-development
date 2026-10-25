import { UserStatus } from "@/app/admin/types/users";
import { BadgeTone, StatusBadge } from "@/app/admin/components/ui/StatusBadge";

export const USER_STATUS: Record<UserStatus, { label: string; tone: BadgeTone }> = {
  active: { label: "Active", tone: "success" },
  disabled: { label: "Disabled", tone: "danger" },
};

export const USER_STATUS_OPTIONS = (Object.keys(USER_STATUS) as UserStatus[]).map((value) => ({
  value,
  label: USER_STATUS[value].label,
}));

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const { label, tone } = USER_STATUS[status];
  return <StatusBadge label={label} tone={tone} />;
}
