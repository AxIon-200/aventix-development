ALTER TABLE "Booking" ADD COLUMN "checkoutKey" TEXT, ADD COLUMN "checkoutHash" TEXT;
CREATE UNIQUE INDEX "Booking_checkoutKey_key" ON "Booking"("checkoutKey");
ALTER TABLE "Payment" ADD COLUMN "checkoutUrl" TEXT;
