import { createHash, randomUUID } from "node:crypto";
import type { Prisma, EventStatus } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { centavos, lockBooking } from "../lib/checkout-bookings.js";
import { categoryLabel, categoryMap, encryptAccount, OrganizerError, reportDates } from "../lib/organizer-input.js";
import type { z } from "zod";
import type { eventCreate, eventUpdate, eventFilters, profileUpdate } from "../lib/organizer-input.js";

const paidBooking = { status: "CONFIRMED", payments: { some: { status: "PAID" } } } satisfies Prisma.BookingWhereInput;
const eventInclude = { venue: true, ticketCategories: { include: { _count: { select: { seats: { where: { enabled: true } } } },
  bookingItems: { where: { booking: paidBooking }, select: { quantity: true, subtotal: true } } } } } satisfies Prisma.EventInclude;
const salesInclude = { user: { select: { name: true } }, event: { select: { name: true } },
  payments: { where: { status: "PAID" }, orderBy: [{ paidAt: "asc" }, { id: "asc" }] },
  items: { include: { ticketCategory: true } } } satisfies Prisma.BookingInclude;
type EventRow = Prisma.EventGetPayload<{ include: typeof eventInclude }>;
type Sale = Prisma.BookingGetPayload<{ include: typeof salesInclude }>;
type EventChanges = z.infer<typeof eventCreate> | Omit<z.infer<typeof eventUpdate>, "expectedUpdatedAt">;
const money = (value: number) => value / 100;
const change = (current: number, previous: number) => previous === 0 ? null : Math.round((current - previous) / previous * 1000) / 10;
const percent = (sold: number, capacity: number | null) => capacity === null ? null : capacity === 0 ? 0 : Math.round(sold / capacity * 100);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
function capacity(tier: EventRow["ticketCategories"][number]) {
  return tier.admissionMode === "ASSIGNED_SEATING" ? Math.min(tier._count.seats, tier.maxCapacity ?? tier._count.seats) : tier.maxCapacity;
}
function presentEvent(event: EventRow) {
  const capacities = event.ticketCategories.map(capacity);
  const totalCapacity = capacities.some(value => value === null) ? null : sum(capacities as number[]);
  const ticketsSold = sum(event.ticketCategories.flatMap(tier => tier.bookingItems.map(item => item.quantity)));
  return { id: event.id, title: event.name, category: categoryLabel(event.eventType), status: event.status,
    startsAt: (event.startTime ?? event.eventDate)?.toISOString() ?? null, venue: event.venue?.name ?? "Not set",
    ticketsSold, totalCapacity, capacityPercent: percent(ticketsSold, totalCapacity),
    grossRevenue: money(sum(event.ticketCategories.flatMap(tier => tier.bookingItems.map(item => centavos(item.subtotal))))),
    publicView: event.status !== "DRAFT" && !!event.venue && !!(event.startTime ?? event.eventDate) };
}
async function sales(organizerId: string, tx: Prisma.TransactionClient) {
  return tx.booking.findMany({ where: { ...paidBooking, event: { organizerId } }, include: salesInclude });
}
const paidAt = (sale: Sale) => sale.payments[0]?.paidAt ?? null;
const within = (sale: Sale, start: Date, end: Date) => { const at = paidAt(sale); return at !== null && at >= start && at < end; };
function totals(rows: Sale[]) {
  return { gross: sum(rows.flatMap(row => row.items.map(item => centavos(item.subtotal)))), orders: rows.length,
    total: sum(rows.map(row => centavos(row.totalAmount))), tickets: sum(rows.flatMap(row => row.items.map(item => item.quantity))) };
}
function presentProfile(profile: Awaited<ReturnType<typeof OrganizerService.organization>>) {
  return { id: profile.id, organizationName: profile.organizationName, contactEmail: profile.contactEmail ?? profile.user.email,
    bio: profile.description ?? "", approvalStatus: profile.approvalStatus, bankName: profile.payoutBankName ?? "",
    accountNumberMasked: profile.payoutAccountLast4 ? `•••• ${profile.payoutAccountLast4}` : null };
}

export class OrganizerService {
  static async organization(userId: string) {
    const profile = await prisma.organizerProfile.findUnique({ where: { userId }, include: { user: { select: { email: true, name: true } } } });
    if (!profile) throw new OrganizerError("ORGANIZATION_UNAVAILABLE", 403);
    if (profile.approvalStatus !== "APPROVED") throw new OrganizerError(`ORGANIZATION_${profile.approvalStatus}`, 403);
    return profile;
  }
  static async profile(userId: string) { return presentProfile(await this.organization(userId)); }
  static async saveProfile(userId: string, input: z.infer<typeof profileUpdate>) {
    const profile = await this.organization(userId);
    const encrypted = input.accountNumber === undefined ? undefined : encryptAccount(input.accountNumber);
    await prisma.organizerProfile.update({ where: { id: profile.id }, data: {
      ...(input.organizationName === undefined ? {} : { organizationName: input.organizationName }),
      ...(input.contactEmail === undefined ? {} : { contactEmail: input.contactEmail }),
      ...(input.bio === undefined ? {} : { description: input.bio }),
      ...(encrypted ? { payoutBankName: input.bankName!, payoutAccountEncrypted: encrypted, payoutAccountLast4: input.accountNumber!.slice(-4) } : {}),
    } });
    return this.profile(userId);
  }
  static async getEvents(organizerId: string, filter: z.infer<typeof eventFilters> = {}) {
    const where: Prisma.EventWhereInput = { organizerId, ...(filter.status ? { status: filter.status as EventStatus } : {}),
      ...(filter.search ? { OR: [{ name: { contains: filter.search, mode: "insensitive" } }, { venue: { name: { contains: filter.search, mode: "insensitive" } } }] } : {}) };
    return (await prisma.event.findMany({ where, include: eventInclude, orderBy: [{ createdAt: "desc" }, { id: "asc" }] })).map(presentEvent);
  }
  static async event(organizerId: string, id: string) {
    const event = await prisma.event.findFirst({ where: { id, organizerId }, include: { venue: true } });
    if (!event) throw new OrganizerError("NOT_FOUND", 404);
    return { id: event.id, title: event.name, category: event.eventType ? categoryLabel(event.eventType) : null,
      startsAt: (event.startTime ?? event.eventDate)?.toISOString() ?? null, venueText: event.venue?.name ?? "",
      description: event.description ?? "", status: event.status, updatedAt: event.updatedAt.toISOString() };
  }
  static async saveEvent(organizerId: string, input: EventChanges, id?: string, expectedUpdatedAt?: string) {
    const savedId = await prisma.$transaction(async tx => {
      if (id) await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${id}::uuid AND "organizerId" = ${organizerId}::uuid FOR UPDATE`;
      const existing = id ? await tx.event.findFirst({ where: { id, organizerId }, include: { venue: true } }) : null;
      if (id && !existing) throw new OrganizerError("NOT_FOUND", 404);
      if (existing && existing.updatedAt.toISOString() !== expectedUpdatedAt) throw new OrganizerError("STALE_EVENT", 409);
      const startsAt = input.startsAt === undefined ? existing?.startTime ?? existing?.eventDate ?? null : input.startsAt ? new Date(input.startsAt) : null;
      const venueText = input.venueText ?? existing?.venue?.name ?? "";
      if (existing && existing.status !== "DRAFT" && (!startsAt || !venueText)) throw new OrganizerError("INCOMPLETE_EVENT", 409);
      let venueId = existing?.venueId ?? null;
      if (input.venueText !== undefined && input.venueText !== (existing?.venue?.name ?? "")) {
        venueId = input.venueText ? (await tx.venue.create({ data: { name: input.venueText, address: "" } })).id : null;
      }
      const data = { ...(input.title === undefined ? {} : { name: input.title }),
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.category === undefined ? {} : { eventType: input.category === null ? null : categoryMap[input.category] }),
        ...(input.startsAt === undefined ? {} : { eventDate: startsAt, startTime: startsAt }), venueId };
      if (existing) {
        await tx.event.update({ where: { id: existing.id }, data: { ...data, updatedAt: new Date(Math.max(Date.now(), existing.updatedAt.getTime() + 1)) } });
        return existing.id;
      }
      const eventId = randomUUID();
      await tx.event.create({ data: { ...data, id: eventId, name: input.title!, organizerId, slug: `event-${eventId}`, status: "DRAFT" } });
      return eventId;
    });
    return this.event(organizerId, savedId);
  }
  static async getDashboard(organizerId: string, organizationName: string, now = new Date()) {
    return prisma.$transaction(async tx => {
      const events = await tx.event.findMany({ where: { organizerId }, include: eventInclude });
      const rows = await sales(organizerId, tx);
      const active = events.filter(event => ["PUBLISHED", "SOLD_OUT"].includes(event.status));
      const summaries = active.map(presentEvent), capacities = summaries.map(event => event.totalCapacity);
      const totalCapacity = capacities.some(value => value === null) ? null : sum(capacities as number[]);
      const gateTickets = await tx.ticket.groupBy({ by: ["status"], where: { status: { in: ["VALID", "USED"] },
        bookingItem: { booking: { ...paidBooking, eventId: { in: active.map(event => event.id) } } } }, _count: true });
      const gateTotal = sum(gateTickets.map(group => group._count)), checkedIn = gateTickets.find(group => group.status === "USED")?._count ?? 0;
      const date = new Date(now.getTime() + 8 * 3600000);
      const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) - 8 * 3600000);
      const previousStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1) - 8 * 3600000);
      const previousEnd = new Date(Math.min(monthStart.getTime(), previousStart.getTime() + now.getTime() - monthStart.getTime()));
      const current = totals(rows.filter(row => within(row, monthStart, now))), previous = totals(rows.filter(row => within(row, previousStart, previousEnd))), total = totals(rows);
      return { organizationName, activeEvents: summaries, metrics: {
        activeEvents: active.length, venues: new Set(active.map(event => event.venueId).filter(Boolean)).size,
        newEventsChange: events.filter(event => event.createdAt >= monthStart && event.createdAt < now).length - events.filter(event => event.createdAt >= previousStart && event.createdAt < previousEnd).length,
        ticketsSold: total.tickets, grossRevenue: money(total.gross), capacityPercent: percent(sum(summaries.map(event => event.ticketsSold)), totalCapacity),
        checkInRate: gateTotal ? Math.round(checkedIn / gateTotal * 100) : 0, ticketsChange: change(current.tickets, previous.tickets), grossChange: change(current.gross, previous.gross),
        hasTestPayments: rows.some(row => row.payments.some(payment => payment.provider.includes("test"))) },
        recentTicketSales: rows.flatMap(row => row.items.map(item => ({ id: item.id, buyerName: row.user.name,
          eventTitle: row.event.name, tier: item.ticketCategory.name, amount: money(centavos(item.subtotal)), purchasedAt: paidAt(row)?.toISOString() ?? null,
          testMode: row.payments[0]?.provider.includes("test") ?? false })))
          .sort((a, b) => (b.purchasedAt ?? "").localeCompare(a.purchasedAt ?? "")).slice(0, 10) };
    }, { isolationLevel: "RepeatableRead" });
  }
  static async analytics(organizerId: string, from: string, to: string) {
    const { start, end, previousStart } = reportDates(from, to);
    return prisma.$transaction(async tx => {
      const all = await sales(organizerId, tx), selected = all.filter(row => within(row, start, end)), previous = all.filter(row => within(row, previousStart, start));
      const currentTotal = totals(selected), previousTotal = totals(previous), buyers = new Set(selected.map(row => row.userId));
      const firstTime = [...buyers].filter(id => !all.some(row => row.userId === id && paidAt(row) !== null && paidAt(row)! < start)).length;
      const events = await tx.event.findMany({ where: { organizerId }, include: eventInclude });
      const tiers = events.flatMap(event => event.ticketCategories.map(tier => {
        const items = selected.flatMap(row => row.items.filter(item => item.ticketCategoryId === tier.id));
        const sold = sum(items.map(item => item.quantity)), total = capacity(tier);
        return { id: tier.id, eventTitle: event.name, name: tier.name, sold, capacity: total,
          revenue: money(sum(items.map(item => centavos(item.subtotal)))), percent: percent(sold, total) };
      }));
      return { from, to, netRevenue: null, grossRevenue: money(currentTotal.gross), grossChange: change(currentTotal.gross, previousTotal.gross),
        averageOrderValue: currentTotal.orders ? money(currentTotal.total) / currentTotal.orders : 0,
        ticketsPerOrder: currentTotal.orders ? currentTotal.tickets / currentTotal.orders : 0,
        uniqueAttendees: buyers.size, firstTimeBuyerPercent: buyers.size ? Math.round(firstTime / buyers.size * 100) : 0, tiers,
        hasTestPayments: selected.some(row => row.payments.some(payment => payment.provider.includes("test"))),
        rows: selected.flatMap(row => row.items.map(item => ({ paidAt: paidAt(row)?.toISOString() ?? "", reference: row.bookingReference,
          eventTitle: row.event.name, tier: item.ticketCategory.name, quantity: item.quantity, unitPrice: money(centavos(item.unitPrice)),
          subtotal: money(centavos(item.subtotal)), testMode: row.payments[0]?.provider.includes("test") ?? false }))) };
    }, { isolationLevel: "RepeatableRead" });
  }
  static async checkIns(userId: string, organizerId: string) {
    const entries = await prisma.ticketVerification.findMany({ where: { verifiedById: userId, result: "VALID",
      ticket: { bookingItem: { booking: { event: { organizerId } } } } }, take: 20,
      orderBy: [{ verifiedAt: "desc" }, { id: "desc" }],
      include: { ticket: { include: { bookingItem: { include: { ticketCategory: true, booking: { include: { user: { select: { name: true } } } } } } } } } });
    return entries.map(entry => ({ id: entry.id, name: entry.ticket!.bookingItem.booking.user.name,
      tier: entry.ticket!.bookingItem.ticketCategory.name, scannedAt: entry.verifiedAt.toISOString(), result: "VALID" }));
  }
  static async validateGateCheckIn(organizerId: string, userId: string, ticketCode: string) {
    const fingerprint = createHash("sha256").update(ticketCode).digest("hex");
    return prisma.$transaction(async tx => {
      const found = await tx.ticket.findFirst({ where: { verificationTokenHash: fingerprint, bookingItem: { booking: { event: { organizerId } } } },
        select: { id: true, bookingItem: { select: { eventId: true, bookingId: true } } } });
      if (!found) {
        await tx.ticketVerification.create({ data: { verifiedById: userId, tokenFingerprint: fingerprint, result: "INVALID" } });
        return { result: "INVALID" };
      }
      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${found.bookingItem.eventId}::uuid FOR UPDATE`;
      await lockBooking(tx, found.bookingItem.bookingId);
      const ticket = await tx.ticket.findUniqueOrThrow({ where: { id: found.id }, include: { bookingItem: { include: {
        ticketCategory: true, booking: { include: { event: true, payments: true, user: { select: { name: true } } } } } } } });
      const booking = ticket.bookingItem.booking;
      let result: "VALID" | "ALREADY_USED" | "CANCELLED" | "EXPIRED" | "INVALID" = "VALID";
      if (booking.event.organizerId !== organizerId) result = "INVALID";
      else if (["CANCELLED", "REFUNDED"].includes(booking.status) || booking.event.status === "CANCELLED" || ticket.status === "CANCELLED") result = "CANCELLED";
      else if (ticket.status === "EXPIRED" || booking.status === "EXPIRED" || booking.event.status === "COMPLETED") result = "EXPIRED";
      else if (booking.status !== "CONFIRMED" || !booking.payments.some(payment => payment.status === "PAID") || !["PUBLISHED", "SOLD_OUT"].includes(booking.event.status)) result = "INVALID";
      else if (ticket.status === "USED") result = "ALREADY_USED";
      const now = new Date();
      if (result === "VALID") {
        const changed = await tx.ticket.updateMany({ where: { id: ticket.id, status: "VALID" }, data: { status: "USED", usedAt: now } });
        if (changed.count !== 1) result = "ALREADY_USED";
      }
      const entry = await tx.ticketVerification.create({ data: { ...(result === "INVALID" ? {} : { ticketId: ticket.id }), verifiedById: userId, tokenFingerprint: fingerprint, result, verifiedAt: now } });
      return { result, ...(result === "VALID" ? { entry: { id: entry.id, name: booking.user.name, tier: ticket.bookingItem.ticketCategory.name, scannedAt: now.toISOString(), result } } : {}) };
    });
  }
}
