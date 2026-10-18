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
export const publicBookingClient: PublicBookingClient = {};

export function bookingErrorMessage(error: unknown): string {
  if (!(error instanceof BookingClientError))
    return "We couldn’t complete this request. Refresh the current booking before trying again.";
  const messages: Record<BookingErrorCode, string> = {
    UNAVAILABLE:
      "The booking service is not connected yet. No seats, bookings, or payments have been created.",
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
    CONTRACT_MISMATCH:
      "The service returned inconsistent booking data. No further action is available until the current booking is refreshed.",
  };
  return messages[error.code];
}
