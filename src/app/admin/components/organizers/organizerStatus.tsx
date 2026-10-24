import type { OrganizerStatus } from "@/app/admin/types/organizers";
import { StatusBadge, type BadgeTone } from "@/app/admin/components/ui/StatusBadge";

export const ORGANIZER_STATUS: Record<OrganizerStatus, { label: string; tone: BadgeTone }> = {
  "awaiting-verification": { label: "Awaiting email verification", tone: "neutral" },
  pending: { label: "Needs review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};
export const ORGANIZER_STATUS_OPTIONS = (Object.keys(ORGANIZER_STATUS) as OrganizerStatus[])
  .map(value => ({ value, label: ORGANIZER_STATUS[value].label }));
export function OrganizerStatusBadge({ status }: { status: OrganizerStatus }) {
  const { label, tone } = ORGANIZER_STATUS[status];
  return <StatusBadge label={label} tone={tone} />;
}
