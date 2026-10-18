import { BookingStatus, PaymentStatus } from "@/app/admin/types/bookings";
import { BadgeTone, StatusBadge } from "@/app/admin/components/ui/StatusBadge";

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: BadgeTone }> = {
  confirmed: { label: "Confirmed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  completed: { label: "Completed", tone: "info" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  paid: { label: "Paid", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  refunded: { label: "Refunded", tone: "danger" },
};

export const BOOKING_STATUS_OPTIONS = (Object.keys(BOOKING_STATUS) as BookingStatus[]).map((value) => ({
  value,
  label: BOOKING_STATUS[value].label,
}));

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, tone } = BOOKING_STATUS[status];
  return <StatusBadge label={label} tone={tone} />;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, tone } = PAYMENT_STATUS[status];
  return <StatusBadge label={label} tone={tone} />;
}
