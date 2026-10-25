import { AdminBooking, PaymentDecision } from "@/app/admin/types/bookings";

// Which payment changes an admin may make on a booking.
// The backend should enforce the same rules (and apply the side effects:
// paid -> a pending booking becomes confirmed, refunded -> booking cancelled).
export function getPaymentTransitions(
  booking: Pick<AdminBooking, "status" | "paymentStatus">
): PaymentDecision[] {
  if (["pending", "failed"].includes(booking.paymentStatus) && booking.status === "pending") return ["paid"];
  if (booking.paymentStatus === "paid" && booking.status !== "completed") return ["refunded"];
  return []; // already refunded, or the event is over, or nothing to collect
}
