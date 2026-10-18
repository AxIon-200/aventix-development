import { OrganizerStatus } from "@/app/admin/types/organizers";
import { BadgeTone, StatusBadge } from "@/app/admin/components/ui/StatusBadge";

export const ORGANIZER_STATUS: Record<OrganizerStatus, { label: string; tone: BadgeTone }> = {
  approved: { label: "Approved", tone: "success" },
  review: { label: "Review", tone: "warning" },
  rejected: { label: "Rejected", tone: "danger" },
  inactive: { label: "Inactive", tone: "neutral" },
};

export const ORGANIZER_STATUS_OPTIONS = (
  Object.keys(ORGANIZER_STATUS) as OrganizerStatus[]
).map((value) => ({ value, label: ORGANIZER_STATUS[value].label }));

export function OrganizerStatusBadge({ status }: { status: OrganizerStatus }) {
  const { label, tone } = ORGANIZER_STATUS[status];
  return <StatusBadge label={label} tone={tone} />;
}
