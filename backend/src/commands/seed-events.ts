import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

// This command is for the local demo backend, which currently runs on .env.test.
// Refuse to write to a different database by accident.
const testRef = process.env.TEST_DATABASE_PROJECT_REF;
const databaseUrl = new URL(env.DATABASE_URL);
const identity = `${databaseUrl.hostname} ${decodeURIComponent(databaseUrl.username)}`;
if (env.NODE_ENV !== "test" || !testRef || !identity.includes(testRef) ||
    !process.env.DEV_DATABASE_URL || env.DATABASE_URL === process.env.DEV_DATABASE_URL) {
  throw new Error("Seed events requires the verified, separate test database from .env.test");
}

const organizerUserId = "b36d9200-9161-40c2-a124-4b300a820001";
const organizerId = "b36d9200-9161-40c2-a124-4b300a820002";
const arenaId = "b36d9200-9161-40c2-a124-4b300a820003";
const astoriaId = "b36d9200-9161-40c2-a124-4b300a820004";
const stadiumId = "b36d9200-9161-40c2-a124-4b300a820005";

const demos = [
  {
    id: "b36d9200-9161-40c2-a124-4b300a820101",
    slug: "demo-neon-nights-2026",
    name: "Neon Nights: Live Sessions",
    description: "An electronic and techno headline show with Charlotte de Witte and Enrico Sangiuliano.",
    artistPerformer: "Charlotte de Witte, Enrico Sangiuliano",
    venueId: astoriaId,
    startsAt: "2026-12-05T19:00:00+08:00",
    endsAt: "2026-12-05T23:30:00+08:00",
    posterUrl: "/images/charlie_puth.jpg",
    salesStartAt: "2026-10-01T10:00:00+08:00",
    salesEndAt: "2026-12-05T18:00:00+08:00",
    categories: [
      { id: "b36d9200-9161-40c2-a124-4b300a820201", name: "VIP", price: 4500, capacity: 45 },
      { id: "b36d9200-9161-40c2-a124-4b300a820202", name: "Patron / Lower Box", price: 2800, capacity: 120 },
      { id: "b36d9200-9161-40c2-a124-4b300a820203", name: "General Admission", price: 1800, capacity: 350 },
    ],
  },
  {
    id: "b36d9200-9161-40c2-a124-4b300a820102",
    slug: "demo-charlie-puth-2026",
    name: "Charlie Puth - Whatever's Clever! World Tour",
    description: "Charlie Puth brings the Whatever's Clever! World Tour to Manila.",
    artistPerformer: "Charlie Puth",
    venueId: arenaId,
    startsAt: "2026-10-14T19:30:00+08:00",
    endsAt: "2026-10-14T22:30:00+08:00",
    posterUrl: "/images/charlie_puth.jpg",
    salesStartAt: "2026-06-01T10:00:00+08:00",
    salesEndAt: "2026-10-14T18:00:00+08:00",
    categories: [
      { id: "b36d9200-9161-40c2-a124-4b300a820204", name: "General Admission", price: 2200, capacity: 412 },
      { id: "b36d9200-9161-40c2-a124-4b300a820205", name: "Mastercard Preferred", price: 4500, capacity: 38 },
    ],
  },
  {
    id: "b36d9200-9161-40c2-a124-4b300a820103",
    slug: "demo-wave-to-earth-2026",
    name: "wave to earth - The Pieces Tour",
    description: "wave to earth performs The Pieces Tour live in Manila with special guest Milena.",
    artistPerformer: "wave to earth, Milena",
    venueId: arenaId,
    startsAt: "2026-11-15T19:00:00+08:00",
    posterUrl: "/images/wave_to_earth.jpg",
    status: "SOLD_OUT" as const,
    categories: [
      { id: "b36d9200-9161-40c2-a124-4b300a820206", name: "General Admission", price: 2200, capacity: 500 },
      { id: "b36d9200-9161-40c2-a124-4b300a820207", name: "VIP", price: 5500, capacity: 100 },
    ],
  },
  {
    id: "b36d9200-9161-40c2-a124-4b300a820104",
    slug: "demo-maroon-5-2027",
    name: "Maroon 5 Asia 2027",
    description: "Maroon 5 return to Manila on their Asia 2027 run.",
    artistPerformer: "Maroon 5",
    venueId: arenaId,
    startsAt: "2027-02-07T20:00:00+08:00",
    posterUrl: "/images/maroon5.jpg",
    salesStartAt: "2026-12-01T10:00:00+08:00",
    categories: [
      { id: "b36d9200-9161-40c2-a124-4b300a820208", name: "General Admission", price: 2200, capacity: 500 },
      { id: "b36d9200-9161-40c2-a124-4b300a820209", name: "VIP", price: 6500, capacity: 100 },
    ],
  },
  {
    id: "b36d9200-9161-40c2-a124-4b300a820105",
    slug: "demo-bts-2027",
    name: "BTS World Tour 'ARIRANG' in Bulacan",
    description: "BTS World Tour 'ARIRANG' at the Philippine Sports Stadium.",
    artistPerformer: "BTS",
    venueId: stadiumId,
    startsAt: "2027-03-13T18:00:00+08:00",
    posterUrl: "/images/bts.jpg",
    status: "CANCELLED" as const,
    categories: [
      { id: "b36d9200-9161-40c2-a124-4b300a820210", name: "General Admission", price: 3200, capacity: 900 },
    ],
  },
] as const;

try {
  await prisma.user.upsert({
    where: { id: organizerUserId },
    update: {},
    create: {
      id: organizerUserId,
      name: "Aventix Demo Organizer",
      firstName: "Aventix",
      lastName: "Demo",
      email: "events-demo@aventix.invalid",
      role: "ORGANIZER",
    },
  });
  await prisma.organizerProfile.upsert({
    where: { id: organizerId },
    update: {},
    create: {
      id: organizerId,
      userId: organizerUserId,
      organizationName: "Aventix Demo Events",
      description: "Sample events for local development.",
      approvalStatus: "APPROVED",
    },
  });
  for (const venue of [
    { id: arenaId, name: "SM Mall of Asia Arena", address: "Seaside Blvd, Mall of Asia Complex, Pasay, Metro Manila" },
    { id: astoriaId, name: "The Astoria", address: "2/F Poblacion Strip, Makati City" },
    { id: stadiumId, name: "Philippine Sports Stadium", address: "Ciudad de Victoria, Bocaue, Bulacan" },
  ]) {
    await prisma.venue.upsert({ where: { id: venue.id }, update: {}, create: venue });
  }
  for (const demo of demos) {
    await prisma.event.upsert({
      where: { id: demo.id },
      update: { status: "status" in demo ? demo.status : "PUBLISHED" },
      create: {
        id: demo.id,
        organizerId,
        venueId: demo.venueId,
        slug: demo.slug,
        name: demo.name,
        description: demo.description,
        eventType: "CONCERT",
        artistPerformer: demo.artistPerformer,
        eventDate: new Date(demo.startsAt),
        startTime: new Date(demo.startsAt),
        ...( "endsAt" in demo ? { endTime: new Date(demo.endsAt) } : {} ),
        posterUrl: demo.posterUrl,
        bannerUrl: demo.posterUrl,
        ...( "salesStartAt" in demo ? { ticketSaleStart: new Date(demo.salesStartAt) } : {} ),
        ...( "salesEndAt" in demo ? { ticketSaleEnd: new Date(demo.salesEndAt) } : {} ),
        status: "status" in demo ? demo.status : "PUBLISHED",
      },
    });
    for (const category of demo.categories) {
      await prisma.ticketCategory.upsert({
        where: { id: category.id },
        update: {},
        create: {
          id: category.id,
          eventId: demo.id,
          name: category.name,
          price: category.price,
          admissionMode: "GENERAL_ADMISSION",
          maxCapacity: category.capacity,
        },
      });
    }
  }
  console.log(`Seeded ${demos.length} sample events in the verified test database.`);
} finally {
  await prisma.$disconnect();
}
