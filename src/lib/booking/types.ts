import type { EventDetails } from "@/types/event";

/** Frontend view models, not approved HTTP payloads or new server contracts. */
export type SeatState = "AVAILABLE" | "HELD" | "SOLD" | "DISABLED";
export interface EventSeat {
  id: string;
  eventId: string;
  ticketCategoryId: string;
  section?: string;
  row?: string;
  seatNumber: string;
  displayLabel: string;
  status: SeatState;
}
export interface TicketOptions {
  event: EventDetails;
  seatPlanUrl?: string;
  purchaseLimit: number;
  confirmedQuantity: number;
  heldQuantity: number;
  /** Server-supplied per-category limit, when applicable. */
  categoryLimits?: Record<string, number>;
}
export interface DraftItem {
  ticketCategoryId: string;
  quantity: number;
  seatIds: string[];
}
export interface BookingDraft {
  version: 1;
  eventId: string;
  items: DraftItem[];
  operationKey?: string;
}
export type BookingStatus =
  "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type RefundStatus =
  "NOT_APPLICABLE" | "PENDING" | "PROCESSING" | "FAILED" | "REFUNDED";
export interface AllocatedSeat {
  id: string;
  displayLabel: string;
  section?: string;
  row?: string;
}
export interface BookingItem {
  ticketCategoryId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  seats: AllocatedSeat[];
}
export interface BookingRecord {
  id: string;
  reference: string;
  event: Pick<EventDetails, "id" | "name" | "startsAt" | "venue" | "status">;
  attendee: { name: string; email: string; phoneNumber?: string };
  status: BookingStatus;
  /** Authoritative booking-level summary, not the latest payment attempt. */
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  refundStatus?: RefundStatus;
  items: BookingItem[];
  subtotal: number;
  fees: { name: string; amount: number }[];
  total: number;
  currency: "PHP";
  expiresAt: string;
  serverNow: string;
  canPay: boolean;
  canCancel: boolean;
  seatPlanUrl?: string;
  /** Supplied by the team's attendee integration; do not guess Sherwin's routes. */
  myTicketsHref?: string;
  issuedTickets?: { id: string; seatLabel: string; href: string }[];
}
export interface PaymentMethod {
  id: string;
  label: string;
  description?: string;
}
export interface PaymentInstructions {
  message?: string;
  redirectUrl?: string;
  qrImageUrl?: string;
  /** Informational instructions only; this response never confirms payment. */
}
