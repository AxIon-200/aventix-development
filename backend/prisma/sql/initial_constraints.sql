CREATE UNIQUE INDEX "BookingSeat_active_seat_unique"
ON "BookingSeat" ("eventSeatId")
WHERE "allocationStatus" IN (
  'HELD'::"SeatAllocationStatus",
  'CONFIRMED'::"SeatAllocationStatus"
)
AND "releasedAt" IS NULL;

-- Event purchase limit
ALTER TABLE "Event"
ADD CONSTRAINT "Event_maxTicketsPerAttendee_positive"
CHECK ("maxTicketsPerAttendee" > 0);

-- Ticket category price
ALTER TABLE "TicketCategory"
ADD CONSTRAINT "TicketCategory_price_nonnegative"
CHECK ("price" >= 0);

-- Ticket category capacity
ALTER TABLE "TicketCategory"
ADD CONSTRAINT "TicketCategory_maxCapacity_positive"
CHECK ("maxCapacity" IS NULL OR "maxCapacity" > 0);

-- Booking subtotal
ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_subtotal_nonnegative"
CHECK ("subtotal" >= 0);

-- Booking total amount
ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_totalAmount_nonnegative"
CHECK ("totalAmount" >= 0);

-- Booking item quantity
ALTER TABLE "BookingItem"
ADD CONSTRAINT "BookingItem_quantity_positive"
CHECK ("quantity" > 0);

-- Booking item unit price
ALTER TABLE "BookingItem"
ADD CONSTRAINT "BookingItem_unitPrice_nonnegative"
CHECK ("unitPrice" >= 0);

-- Booking item subtotal
ALTER TABLE "BookingItem"
ADD CONSTRAINT "BookingItem_subtotal_nonnegative"
CHECK ("subtotal" >= 0);

-- Payment amount
ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_amount_positive"
CHECK ("amount" > 0);

ALTER TABLE "user"
ADD CONSTRAINT "user_role_valid"
CHECK ("role" IN (
  'ATTENDEE',
  'ORGANIZER',
  'ADMINISTRATOR'
));

ALTER TABLE "user"
ADD CONSTRAINT "user_status_valid"
CHECK ("status" IN (
  'ACTIVE',
  'DISABLED'
));
ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_bookingSeat_bookingItem_fkey"
FOREIGN KEY ("bookingSeatId", "bookingItemId")
REFERENCES "BookingSeat" ("id", "bookingItemId")
ON DELETE RESTRICT
ON UPDATE CASCADE;