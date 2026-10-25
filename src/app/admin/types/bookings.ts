export type BookingStatus = "confirmed" | "pending" | "completed" | "cancelled" | "expired" | "refunded";
export type BookingStatusFilter = BookingStatus | "all";

export type PaymentStatus = "paid" | "pending" | "refunded" | "failed";

// What an admin can set a payment to from the table / details modal.
export type PaymentDecision = "paid" | "refunded";

export type BookingFilters = {
  status: BookingStatusFilter;
  event: string; // an event id, or "all"
};

// One row of the table (GET /admin/bookings)
export type AdminBooking = {
  id: string;
  bookingCode: string; // display id, e.g. "BKG-9031"
  eventId: string;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  tickets: number;
  amount: number; // total in PHP
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string; // ISO, shown as the booking date
};

export type BookingLineItem = {
  tier: string;
  quantity: number;
  unitPrice: number;
};

// GET /admin/bookings/:id (details modal)
export type AdminBookingDetails = AdminBooking & {
  customerPhone?: string | null;
  eventStartsAt: string | null; // ISO when scheduled
  eventVenue: string;
  paymentMethod?: string | null; // "GCash", "Card", ...
  paidAt?: string | null;
  refundedAt?: string | null;
  paymentNote?: string | null; // note an admin left when changing payment state
  items: BookingLineItem[];
};

// GET /admin/bookings/stats  (computed for the CURRENT search + filters)
export type BookingStats = {
  total: number;
  confirmed: number;
  pending: number;
  totalValue: number; // sum of confirmed and unexpired pending booking amounts
};

// GET /admin/bookings/event-options  (fills the "All event" dropdown)
export type EventOption = { value: string; label: string };
