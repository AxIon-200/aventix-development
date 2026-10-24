import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

// Only the separate test database and seeded demo organizer may be changed.
const testRef = process.env.TEST_DATABASE_PROJECT_REF;
const databaseUrl = new URL(env.DATABASE_URL);
const identity = `${databaseUrl.hostname} ${decodeURIComponent(databaseUrl.username)}`;
if (env.NODE_ENV !== "test" || !testRef || !identity.includes(testRef) ||
    !process.env.DEV_DATABASE_URL || env.DATABASE_URL === process.env.DEV_DATABASE_URL) {
  throw new Error("Preparing demo seats requires the verified, separate test database from .env.test");
}

try {
  const categories = await prisma.ticketCategory.findMany({
    where: { event: { organizerId: "b36d9200-9161-40c2-a124-4b300a820002", slug: { startsWith: "demo-" } } },
    include: { _count: { select: { bookingItems: true } } },
  });
  if (categories.some((category) => category._count.bookingItems > 0)) {
    throw new Error("Demo bookings already exist; refusing to reset their seating arrangement.");
  }
  let total = 0;
  for (const category of categories) {
    const capacity = category.maxCapacity;
    if (capacity === null || capacity < 1 || capacity > 10000) continue;
    const seats = Array.from({ length: capacity }, (_, index) => {
      const row = String(Math.floor(index / 20) + 1).padStart(2, "0");
      const seatNumber = String(index % 20 + 1).padStart(2, "0");
      return {
        eventId: category.eventId, ticketCategoryId: category.id,
        section: category.name, row, seatNumber,
        displayLabel: `${category.name} · Row ${row} · Seat ${seatNumber}`, enabled: true,
      };
    });
    await prisma.$transaction(async (tx) => {
      await tx.eventSeat.createMany({ data: seats, skipDuplicates: true });
      await tx.eventSeat.updateMany({ where: { ticketCategoryId: category.id }, data: { enabled: true } });
      await tx.ticketCategory.update({ where: { id: category.id }, data: { admissionMode: "ASSIGNED_SEATING" } });
    });
    total += capacity;
  }
  console.log(`Prepared ${total} available demo seats across ${categories.length} ticket tiers in the verified test database.`);
} finally {
  await prisma.$disconnect();
}
