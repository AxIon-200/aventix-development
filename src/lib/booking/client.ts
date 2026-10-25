import type {
  BookingDraft,
  BookingRecord,
  EventSeat,
  PaymentInstructions,
  PaymentMethod,
  TicketOptions,
} from "./types";

export type BookingErrorCode =
  | "UNAVAILABLE"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SEAT_UNAVAILABLE"
  | "SEAT_SELECTION_INVALID"
  | "PURCHASE_LIMIT_EXCEEDED"
  | "BOOKING_EVENT_MISMATCH"
  | "BOOKING_EXPIRED"
  | "BOOKING_NOT_CANCELLABLE"
  | "INVENTORY_CHANGED"
  | "NETWORK_UNCERTAIN"
  | "PAYMENT_PROCESSING"
  | "PAYMENT_UNAVAILABLE"
  | "IDEMPOTENCY_CONFLICT"
  | "CONTRACT_MISMATCH";

export class BookingClientError extends Error {
  constructor(public code: BookingErrorCode) {
    super(code);
  }
}

/** Map these view operations to the existing agreed API client once supplied.
 * No URLs, credentials, transport payloads, session store, or backend are invented.
 * Mutations must be authorized and atomic on the server. operationKey is a UI
 * request identity; map it to approved idempotency support, never assume support.
 */
export interface PublicBookingClient {
  getTicketOptions?: (eventId: string) => Promise<TicketOptions>;
  getSeats?: (eventId: string) => Promise<EventSeat[]>;
  createBooking?: (
    draft: BookingDraft,
    operationKey: string,
  ) => Promise<BookingRecord>;
  getBooking?: (bookingId: string) => Promise<BookingRecord>;
  getPaymentMethods?: (bookingId: string) => Promise<PaymentMethod[]>;
  startPayment?: (
    bookingId: string,
    methodId: string,
    operationKey: string,
  ) => Promise<PaymentInstructions>;
  cancelUnpaidBooking?: (
    bookingId: string,
    operationKey: string,
  ) => Promise<BookingRecord>;
  trustedPaymentOrigins?: string[];
}
async function bookingRequest<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/checkout${path}`, { method: body === undefined ? "GET" : "POST",
      credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(25000), headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body) });
  } catch { throw new BookingClientError("NETWORK_UNCERTAIN"); }
  const result = await response.json();
  if (!response.ok) {
    const code = response.status === 401 ? "UNAUTHENTICATED" : response.status === 403 ? "FORBIDDEN"
      : response.status === 404 ? "NOT_FOUND" : result.error?.code;
    const known = ["SEAT_UNAVAILABLE", "SEAT_SELECTION_INVALID", "PURCHASE_LIMIT_EXCEEDED", "BOOKING_EVENT_MISMATCH",
      "BOOKING_EXPIRED", "BOOKING_NOT_CANCELLABLE", "INVENTORY_CHANGED", "NETWORK_UNCERTAIN", "UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND",
      "PAYMENT_PROCESSING", "PAYMENT_UNAVAILABLE", "IDEMPOTENCY_CONFLICT"];
    throw new BookingClientError(known.includes(code) ? code : "UNAVAILABLE");
  }
  return result.data as T;
}
export const publicBookingClient: PublicBookingClient = {
  getTicketOptions: id => bookingRequest(`/events/${encodeURIComponent(id)}/options`),
  getSeats: id => bookingRequest(`/events/${encodeURIComponent(id)}/seats`),
  createBooking: (draft, operationKey) => bookingRequest("/bookings", { version: draft.version, eventId: draft.eventId, items: draft.items, operationKey }),
  getBooking: id => bookingRequest(`/bookings/${encodeURIComponent(id)}`),
  getPaymentMethods: id => bookingRequest(`/bookings/${encodeURIComponent(id)}/payment-methods`),
  startPayment: (id, methodId, operationKey) => bookingRequest(`/bookings/${encodeURIComponent(id)}/payment`, { methodId, operationKey }),
  cancelUnpaidBooking: (id, operationKey) => bookingRequest(`/bookings/${encodeURIComponent(id)}/cancel`, { operationKey }),
  trustedPaymentOrigins: ["https://checkout.paymongo.com"],
};

export function bookingErrorMessage(error: unknown): string {
  if (!(error instanceof BookingClientError))
    return "We couldn’t complete this request. Refresh the current booking before trying again.";
  const messages: Record<BookingErrorCode, string> = {
    UNAVAILABLE:
      "The payment service could not complete this request. Refresh your booking and try again.",
    UNAUTHENTICATED: "Please log in again to continue.",
    FORBIDDEN:
      "This account cannot access this booking or perform this action.",
    NOT_FOUND: "This booking is unavailable or could not be found.",
    SEAT_UNAVAILABLE:
      "One or more seats are no longer available. Refresh the layout and choose replacements.",
    SEAT_SELECTION_INVALID:
      "The seat selection no longer matches the ticket quantities. Review each category.",
    PURCHASE_LIMIT_EXCEEDED:
      "Your confirmed tickets and active holds exceed the event’s purchase limit. Refresh your selection.",
    BOOKING_EVENT_MISMATCH:
      "The selected tickets do not all belong to this event. Review your selection.",
    BOOKING_EXPIRED:
      "This reservation has expired. Return to the event and make a fresh selection.",
    BOOKING_NOT_CANCELLABLE:
      "This booking cannot be cancelled. Refresh to see its current status.",
    INVENTORY_CHANGED:
      "Availability has changed. Refresh the current options before continuing.",
    NETWORK_UNCERTAIN:
      "The request result is unknown. Do not create another booking or payment. Refresh your existing booking or check your booking history first.",
    PAYMENT_PROCESSING:
      "PayMongo has not confirmed that payment has stopped. Your reservation is still held. Refresh the booking before trying again.",
    PAYMENT_UNAVAILABLE:
      "PayMongo could not open checkout. Your reservation is still held; try again before it expires.",
    IDEMPOTENCY_CONFLICT:
      "This request already created a different reservation. Check your booking history before booking again.",
    CONTRACT_MISMATCH:
      "The service returned inconsistent booking data. No further action is available until the current booking is refreshed.",
  };
  return messages[error.code];
}
