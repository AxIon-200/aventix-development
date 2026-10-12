-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ATTENDEE', 'ORGANIZER', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "OrganizerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CONCERT', 'GIG', 'MUSIC_FESTIVAL');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SOLD_OUT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdmissionMode" AS ENUM ('ASSIGNED_SEATING', 'GENERAL_ADMISSION');

-- CreateEnum
CREATE TYPE "TicketCategoryStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SeatAllocationStatus" AS ENUM ('HELD', 'CONFIRMED', 'RELEASED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('VALID', 'USED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TicketVerificationResult" AS ENUM ('VALID', 'ALREADY_USED', 'CANCELLED', 'EXPIRED', 'INVALID');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "role" TEXT NOT NULL DEFAULT 'ATTENDEE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "termsAcceptedAt" TIMESTAMP(3),
    "termsVersion" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" UUID NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizerProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationName" TEXT NOT NULL,
    "description" TEXT,
    "approvalStatus" "OrganizerStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "venueId" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "EventType",
    "artistPerformer" TEXT,
    "eventDate" TIMESTAMP(3),
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "posterUrl" TEXT,
    "bannerUrl" TEXT,
    "ticketSaleStart" TIMESTAMP(3),
    "ticketSaleEnd" TIMESTAMP(3),
    "maxTicketsPerAttendee" INTEGER NOT NULL DEFAULT 2,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMedia" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketCategory" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "admissionMode" "AdmissionMode" NOT NULL,
    "maxCapacity" INTEGER,
    "saleStartAt" TIMESTAMP(3),
    "saleEndAt" TIMESTAMP(3),
    "status" "TicketCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSeat" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "ticketCategoryId" UUID NOT NULL,
    "section" TEXT,
    "row" TEXT,
    "seatNumber" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingItem" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "ticketCategoryId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSeat" (
    "id" UUID NOT NULL,
    "eventSeatId" UUID NOT NULL,
    "bookingItemId" UUID NOT NULL,
    "ticketCategoryId" UUID NOT NULL,
    "allocationStatus" "SeatAllocationStatus" NOT NULL DEFAULT 'HELD',
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT,
    "paymentMethod" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundStatus" TEXT,
    "refundProviderReference" TEXT,
    "refundError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL,
    "bookingItemId" UUID NOT NULL,
    "bookingSeatId" UUID,
    "ticketCode" TEXT NOT NULL,
    "verificationTokenHash" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'VALID',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketVerification" (
    "id" UUID NOT NULL,
    "ticketId" UUID,
    "verifiedById" UUID NOT NULL,
    "tokenFingerprint" TEXT NOT NULL,
    "result" "TicketVerificationResult" NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerProfile_userId_key" ON "OrganizerProfile"("userId");

-- CreateIndex
CREATE INDEX "OrganizerProfile_approvalStatus_idx" ON "OrganizerProfile"("approvalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_organizerId_idx" ON "Event"("organizerId");

-- CreateIndex
CREATE INDEX "Event_venueId_idx" ON "Event"("venueId");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_eventDate_idx" ON "Event"("eventDate");

-- CreateIndex
CREATE INDEX "EventMedia_eventId_idx" ON "EventMedia"("eventId");

-- CreateIndex
CREATE INDEX "EventMedia_uploadedById_idx" ON "EventMedia"("uploadedById");

-- CreateIndex
CREATE INDEX "EventMedia_eventId_displayOrder_idx" ON "EventMedia"("eventId", "displayOrder");

-- CreateIndex
CREATE INDEX "TicketCategory_eventId_idx" ON "TicketCategory"("eventId");

-- CreateIndex
CREATE INDEX "TicketCategory_eventId_status_idx" ON "TicketCategory"("eventId", "status");

-- CreateIndex
CREATE INDEX "TicketCategory_eventId_admissionMode_idx" ON "TicketCategory"("eventId", "admissionMode");

-- CreateIndex
CREATE UNIQUE INDEX "TicketCategory_id_eventId_key" ON "TicketCategory"("id", "eventId");

-- CreateIndex
CREATE INDEX "EventSeat_eventId_idx" ON "EventSeat"("eventId");

-- CreateIndex
CREATE INDEX "EventSeat_ticketCategoryId_idx" ON "EventSeat"("ticketCategoryId");

-- CreateIndex
CREATE INDEX "EventSeat_eventId_ticketCategoryId_idx" ON "EventSeat"("eventId", "ticketCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "EventSeat_id_ticketCategoryId_key" ON "EventSeat"("id", "ticketCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "EventSeat_eventId_displayLabel_key" ON "EventSeat"("eventId", "displayLabel");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingReference_key" ON "Booking"("bookingReference");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_eventId_idx" ON "Booking"("eventId");

-- CreateIndex
CREATE INDEX "Booking_status_expiresAt_idx" ON "Booking"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Booking_userId_eventId_idx" ON "Booking"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_id_eventId_key" ON "Booking"("id", "eventId");

-- CreateIndex
CREATE INDEX "BookingItem_bookingId_idx" ON "BookingItem"("bookingId");

-- CreateIndex
CREATE INDEX "BookingItem_ticketCategoryId_idx" ON "BookingItem"("ticketCategoryId");

-- CreateIndex
CREATE INDEX "BookingItem_eventId_idx" ON "BookingItem"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingItem_id_ticketCategoryId_key" ON "BookingItem"("id", "ticketCategoryId");

-- CreateIndex
CREATE INDEX "BookingSeat_eventSeatId_idx" ON "BookingSeat"("eventSeatId");

-- CreateIndex
CREATE INDEX "BookingSeat_bookingItemId_idx" ON "BookingSeat"("bookingItemId");

-- CreateIndex
CREATE INDEX "BookingSeat_ticketCategoryId_idx" ON "BookingSeat"("ticketCategoryId");

-- CreateIndex
CREATE INDEX "BookingSeat_eventSeatId_allocationStatus_idx" ON "BookingSeat"("eventSeatId", "allocationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BookingSeat_id_bookingItemId_key" ON "BookingSeat"("id", "bookingItemId");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_bookingId_status_idx" ON "Payment"("bookingId", "status");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerReference_key" ON "Payment"("provider", "providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_bookingSeatId_key" ON "Ticket"("bookingSeatId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketCode_key" ON "Ticket"("ticketCode");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_verificationTokenHash_key" ON "Ticket"("verificationTokenHash");

-- CreateIndex
CREATE INDEX "Ticket_bookingItemId_idx" ON "Ticket"("bookingItemId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "TicketVerification_ticketId_idx" ON "TicketVerification"("ticketId");

-- CreateIndex
CREATE INDEX "TicketVerification_verifiedById_idx" ON "TicketVerification"("verifiedById");

-- CreateIndex
CREATE INDEX "TicketVerification_result_idx" ON "TicketVerification"("result");

-- CreateIndex
CREATE INDEX "TicketVerification_verifiedAt_idx" ON "TicketVerification"("verifiedAt");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerProfile" ADD CONSTRAINT "OrganizerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerProfile" ADD CONSTRAINT "OrganizerProfile_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "OrganizerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMedia" ADD CONSTRAINT "EventMedia_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMedia" ADD CONSTRAINT "EventMedia_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCategory" ADD CONSTRAINT "TicketCategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSeat" ADD CONSTRAINT "EventSeat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSeat" ADD CONSTRAINT "EventSeat_ticketCategoryId_eventId_fkey" FOREIGN KEY ("ticketCategoryId", "eventId") REFERENCES "TicketCategory"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_bookingId_eventId_fkey" FOREIGN KEY ("bookingId", "eventId") REFERENCES "Booking"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_ticketCategoryId_eventId_fkey" FOREIGN KEY ("ticketCategoryId", "eventId") REFERENCES "TicketCategory"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSeat" ADD CONSTRAINT "BookingSeat_eventSeatId_ticketCategoryId_fkey" FOREIGN KEY ("eventSeatId", "ticketCategoryId") REFERENCES "EventSeat"("id", "ticketCategoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSeat" ADD CONSTRAINT "BookingSeat_bookingItemId_ticketCategoryId_fkey" FOREIGN KEY ("bookingItemId", "ticketCategoryId") REFERENCES "BookingItem"("id", "ticketCategoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_bookingItemId_fkey" FOREIGN KEY ("bookingItemId") REFERENCES "BookingItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_bookingSeatId_fkey" FOREIGN KEY ("bookingSeatId") REFERENCES "BookingSeat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketVerification" ADD CONSTRAINT "TicketVerification_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketVerification" ADD CONSTRAINT "TicketVerification_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
