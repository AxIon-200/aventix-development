export type BookingStatus = "confirmed" | "pending" | "completed" | "cancelled";
export type BookingStatusFilter = BookingStatus | "all";

export type PaymentStatus = "paid" | "pending" | "refunded";

// What an admin can set a payment to from the table / details modal.
export type PaymentDecision = Exclude<PaymentStatus, "pending">;

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
  eventStartsAt: string; // ISO
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
  totalValue: number; // sum of `amount` for bookings that are not cancelled
};

// GET /admin/bookings/event-options  (fills the "All event" dropdown)
export type EventOption = { value: string; label: string };
