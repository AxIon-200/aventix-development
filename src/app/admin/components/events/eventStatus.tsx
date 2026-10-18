import { EventCategory, EventStatus } from "@/app/admin/types/events";
import { BadgeTone, StatusBadge } from "@/app/admin/components/ui/StatusBadge";

export const EVENT_STATUS: Record<
  EventStatus,
  { label: string; tone: BadgeTone; description: string }
> = {
  published: {
    label: "Published",
    tone: "success",
    description: "Visible to attendees and open for booking.",
  },
  draft: {
    label: "Draft",
    tone: "warning",
    description: "Hidden from attendees. Existing tickets stay valid.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "danger",
    description: "Removed from availability. Booking is closed.",
  },
};

// Which statuses an admin may move an event to, from each current status.
// (The backend should enforce the same rules.)
export const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  published: ["draft", "cancelled"],
  draft: ["published", "cancelled"],
  cancelled: ["draft"], // restore as a draft first, then review and publish
};

export const EVENT_STATUS_OPTIONS = (Object.keys(EVENT_STATUS) as EventStatus[]).map((value) => ({
  value,
  label: EVENT_STATUS[value].label,
}));

export const EVENT_CATEGORY_LABEL: Record<EventCategory, string> = {
  concert: "Concert",
  gig: "Gig",
  festival: "Festival",
};

export const EVENT_CATEGORY_OPTIONS = (Object.keys(EVENT_CATEGORY_LABEL) as EventCategory[]).map(
  (value) => ({ value, label: EVENT_CATEGORY_LABEL[value] })
);

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const { label, tone } = EVENT_STATUS[status];
  return <StatusBadge label={label} tone={tone} />;
}
