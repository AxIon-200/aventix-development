export type TransactionStatus = "paid" | "pending" | "refunded";
export type TransactionStatusFilter = TransactionStatus | "all";

export type PaymentFilters = { status: TransactionStatusFilter };

// One row of the table (GET /admin/payments)
export type Payment = {
  id: string;
  paymentCode: string; // display id, e.g. "PAY-70331"
  userName: string;
  methodLabel: string; // display text, e.g. "GCash" or "Visa •••• 4921"
  amount: number; // PHP
  status: TransactionStatus;
  createdAt: string; // ISO, shown as date + time
};

export type PaymentTimelineEntry = {
  label: string; // e.g. "Payment captured"
  at: string; // ISO
};

// GET /admin/payments/:id (details modal)
export type PaymentDetails = Payment & {
  userEmail: string;
  bookingCode: string;
  eventTitle: string;
  reference: string; // the payment provider's transaction reference
  timeline: PaymentTimelineEntry[]; // oldest first
};

// GET /admin/payments/stats  (computed for the CURRENT search + filters)
export type PaymentStats = {
  total: number;
  paid: number;
  pending: number;
  recordedValue: number; // sum of `amount` for ALL rows in view, refunded included
};
