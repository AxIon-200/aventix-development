import { ActorRole, LogCategory, LogResult } from "@/app/admin/types/activity-logs";
import { BadgeTone, StatusBadge } from "@/app/admin/components/ui/StatusBadge";

export const LOG_CATEGORY_LABEL: Record<LogCategory, string> = {
  auth: "Authentication",
  user: "Users",
  organizer: "Organizers",
  event: "Events",
  booking: "Bookings",
  payment: "Payments",
  system: "System",
};

export const LOG_CATEGORY_OPTIONS = (Object.keys(LOG_CATEGORY_LABEL) as LogCategory[]).map(
  (value) => ({ value, label: LOG_CATEGORY_LABEL[value] })
);

export const LOG_RESULT: Record<LogResult, { label: string; tone: BadgeTone }> = {
  success: { label: "Success", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

export const LOG_RESULT_OPTIONS = (Object.keys(LOG_RESULT) as LogResult[]).map((value) => ({
  value,
  label: LOG_RESULT[value].label,
}));

export const ACTOR_ROLE_LABEL: Record<ActorRole, string> = {
  admin: "Admin",
  organizer: "Organizer",
  user: "Attendee",
  system: "System",
};

export function LogResultBadge({ result }: { result: LogResult }) {
  const { label, tone } = LOG_RESULT[result];
  return <StatusBadge label={label} tone={tone} />;
}
