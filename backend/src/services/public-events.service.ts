import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

const eventInclude = {
  venue: true,
  organizer: true,
  media: { orderBy: { displayOrder: "asc" as const } },
  ticketCategories: {
    orderBy: { price: "asc" as const },
    include: {
      seats: {
        where: { enabled: true },
        orderBy: [{ row: "asc" as const }, { seatNumber: "asc" as const }],
        include: {
          bookingSeats: {
            select: {
              allocationStatus: true,
              bookingItem: { select: { booking: { select: { status: true, expiresAt: true } } } },
            },
          },
        },
      },
      bookingItems: {
        where: {
          booking: {
            status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
          },
        },
        select: { quantity: true, booking: { select: { status: true, expiresAt: true } } },
      },
    },
  },
} satisfies Prisma.EventInclude;

type PublicEventRow = NonNullable<Awaited<ReturnType<typeof findEvent>>>;

function availability(
  event: PublicEventRow,
  category: PublicEventRow["ticketCategories"][number],
  now: Date,
  remaining: number | undefined,
) {
  if (event.status === "SOLD_OUT" || remaining === 0) return "SOLD_OUT";
  const start = category.saleStartAt ?? event.ticketSaleStart;
  const end = category.saleEndAt ?? event.ticketSaleEnd;
  if (start && now < start) return "NOT_YET_OPEN";
  if (end && now > end) return "SALE_ENDED";
  return "AVAILABLE";
}

function toPublicEvent(event: PublicEventRow) {
  const startsAt = event.startTime ?? event.eventDate;
  if (!event.venue || !startsAt) return null;

  const now = new Date();
  return {
    id: event.id,
    name: event.name,
    performers: event.artistPerformer ? event.artistPerformer.split(",").map((name) => name.trim()).filter(Boolean) : [],
    type: event.eventType === "MUSIC_FESTIVAL" ? "Festival" : event.eventType === "GIG" ? "Gig" : "Concert",
    description: event.description ?? "",
    ...(event.bannerUrl ? { bannerUrl: event.bannerUrl } : {}),
    ...(event.posterUrl ? { posterUrl: event.posterUrl } : {}),
    gallery: event.media.map((item) => item.url),
    startsAt: startsAt.toISOString(),
    ...(event.endTime ? { endsAt: event.endTime.toISOString() } : {}),
    venue: {
      name: event.venue.name,
      address: event.venue.address,
      ...(event.venue.latitude ? { latitude: event.venue.latitude.toNumber() } : {}),
      ...(event.venue.longitude ? { longitude: event.venue.longitude.toNumber() } : {}),
    },
    organizer: {
      id: event.organizer.id,
      name: event.organizer.organizationName,
      ...(event.organizer.description ? { description: event.organizer.description } : {}),
    },
    status: event.status === "SOLD_OUT" ? "PUBLISHED" : event.status,
    ...(event.ticketSaleStart ? { salesStartAt: event.ticketSaleStart.toISOString() } : {}),
    ...(event.ticketSaleEnd ? { salesEndAt: event.ticketSaleEnd.toISOString() } : {}),
    categories: event.ticketCategories.map((category) => {
      const seats = category.seats.filter((seat) => !seat.bookingSeats.some((allocation) => {
        const booking = allocation.bookingItem.booking;
        return allocation.allocationStatus !== "RELEASED" &&
          (booking.status === "CONFIRMED" || booking.status === "PENDING_PAYMENT");
      })).map((seat) => ({
        id: seat.id, section: seat.section ?? "", row: seat.row ?? "",
        seatNumber: seat.seatNumber, label: seat.displayLabel,
      }));
      const reserved = category.bookingItems.reduce((total, item) =>
        total + item.quantity, 0);
      const remaining = event.status === "SOLD_OUT" ? 0
        : category.admissionMode === "ASSIGNED_SEATING"
          ? Math.min(seats.length, category.maxCapacity === null ? seats.length : Math.max(0, category.maxCapacity - reserved))
          : category.maxCapacity === null ? undefined : Math.max(0, category.maxCapacity - reserved);
      return {
        id: category.id,
        name: category.name,
        ...(category.description ? { description: category.description } : {}),
        price: category.price.toNumber(),
        status: category.status,
        admissionMode: category.admissionMode,
        ...(category.admissionMode === "ASSIGNED_SEATING" ? { seats } : {}),
        availability: availability(event, category, now, remaining),
        ...(remaining !== undefined ? { remaining } : {}),
        ...(category.saleStartAt ? { salesStartAt: category.saleStartAt.toISOString() } : {}),
        ...(category.saleEndAt ? { salesEndAt: category.saleEndAt.toISOString() } : {}),
      };
    }),
  };
}

function findEvent(id: string) {
  return prisma.event.findUnique({ where: { id }, include: eventInclude });
}

export class PublicEventsService {
  static async list() {
    const events = await prisma.event.findMany({
      where: { status: { in: ["PUBLISHED", "SOLD_OUT", "COMPLETED", "CANCELLED"] } },
      include: eventInclude,
      orderBy: [{ eventDate: "asc" }, { id: "asc" }],
    });
    return events.map(toPublicEvent).filter((event) => event !== null);
  }

  static async get(id: string) {
    const event = await findEvent(id);
    if (!event || event.status === "DRAFT") return null;
    return toPublicEvent(event);
  }
}
