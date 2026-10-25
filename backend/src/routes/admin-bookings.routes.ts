import { Router, type Response } from "express";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { requireRoles } from "../lib/authorization.js";
import type { createAuth } from "../lib/auth.js";
import { env } from "../config/env.js";

const filters = z.object({ search: z.string().trim().max(100).optional(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "expired", "refunded"]).optional(), event: z.uuid().optional() }).strict();
const listInput = filters.extend({ page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10) });
const paymentInput = z.object({ paymentStatus: z.enum(["paid", "refunded"]), note: z.string().trim().max(500).optional() }).strict();
const include = { user: { select: { name: true, email: true, phoneNumber: true } },
  event: { include: { venue: true } }, items: { include: { ticketCategory: true } },
  payments: { orderBy: [{ createdAt: "desc" }, { id: "desc" }] },
} satisfies Prisma.BookingInclude;
type Row = Prisma.BookingGetPayload<{ include: typeof include }>;
function bookingStatus(b: Row, now: Date) {
  if (b.status === "PENDING_PAYMENT") return b.expiresAt <= now ? "expired" : "pending";
  if (b.status === "CONFIRMED" && b.event.status === "COMPLETED") return "completed";
  return b.status.toLowerCase();
}
function paymentFor(b: Row) {
  // A failed retry must not hide an earlier successful payment.
  return b.payments.find(p => p.status === "PAID" || p.status === "REFUNDED") ?? b.payments[0];
}
function present(b: Row, now: Date) {
  return { id: b.id, bookingCode: b.bookingReference, eventId: b.eventId, eventTitle: b.event.name,
    customerName: b.user.name, customerEmail: b.user.email,
    tickets: b.items.reduce((sum, item) => sum + item.quantity, 0), amount: b.totalAmount.toNumber(),
    status: bookingStatus(b, now), paymentStatus: paymentFor(b)?.status.toLowerCase() ?? "pending", createdAt: b.createdAt.toISOString() };
}
function where(f: z.infer<typeof filters>, now: Date): Prisma.BookingWhereInput {
  const status: Prisma.BookingWhereInput = f.status === "pending" ? { status: "PENDING_PAYMENT", expiresAt: { gt: now } }
    : f.status === "expired" ? { OR: [{ status: "EXPIRED" }, { status: "PENDING_PAYMENT", expiresAt: { lte: now } }] }
    : f.status === "completed" ? { status: "CONFIRMED", event: { status: "COMPLETED" } }
    : f.status === "confirmed" ? { status: "CONFIRMED", event: { status: { not: "COMPLETED" } } }
    : f.status === "cancelled" ? { status: "CANCELLED" }
    : f.status === "refunded" ? { status: "REFUNDED" } : {};
  return { AND: [status, ...(f.event ? [{ eventId: f.event }] : []), ...(f.search ? [{ OR: [
    { bookingReference: { contains: f.search, mode: "insensitive" as const } },
    { user: { name: { contains: f.search, mode: "insensitive" as const } } },
    { user: { email: { contains: f.search, mode: "insensitive" as const } } },
    { event: { name: { contains: f.search, mode: "insensitive" as const } } },
  ] }] : [])] };
}
function fail(res: Response, status = 400, code = "VALIDATION_ERROR", message = "Invalid booking management input") {
  return res.status(status).json({ error: { code, message } });
}
function csv(value: unknown) {
  const raw = String(value ?? "");
  return `"${(/^\s*[=+\-@]/u.test(raw) ? `'${raw}` : raw).replaceAll('"', '""')}"`;
}
export function adminBookingsRouter(auth: ReturnType<typeof createAuth>, clock = () => new Date()) {
  const router = Router();
  router.use(requireRoles(auth, ["ADMINISTRATOR"]));
  router.use((req, res, next) => {
    if (req.method === "PATCH") {
      if (req.get("Origin") !== env.FRONTEND_URL) { fail(res, 403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed"); return; }
      if (!req.is("application/json")) { fail(res, 415, "UNSUPPORTED_MEDIA_TYPE", "JSON content type is required"); return; }
    }
    next();
  });
  router.get("/event-options", async (req, res) => {
    if (!z.object({}).strict().safeParse(req.query).success) return fail(res);
    try {
      const events = await prisma.event.findMany({ where: { bookings: { some: {} } }, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }] });
      return res.json(events.map(e => ({ value: e.id, label: e.name })));
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load booking events"); }
  });
  router.get("/stats", async (req, res) => {
    const parsed = filters.safeParse(req.query);
    if (!parsed.success) return fail(res);
    const now = clock();
    try {
      const scoped = where(parsed.data, now);
      const [total, confirmed, pending, value] = await prisma.$transaction([
        prisma.booking.count({ where: scoped }),
        prisma.booking.count({ where: { AND: [scoped, where({ status: "confirmed" }, now)] } }),
        prisma.booking.count({ where: { AND: [scoped, where({ status: "pending" }, now)] } }),
        prisma.booking.aggregate({ where: { AND: [scoped, { status: { in: ["PENDING_PAYMENT", "CONFIRMED"] } },
          { OR: [{ status: "CONFIRMED" }, { expiresAt: { gt: now } }] }] }, _sum: { totalAmount: true } }),
      ], { isolationLevel: "RepeatableRead" });
      return res.json({ total, confirmed, pending, totalValue: value._sum.totalAmount?.toNumber() ?? 0 });
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load booking statistics"); }
  });
  router.get("/export", async (req, res) => {
    const parsed = filters.safeParse(req.query);
    if (!parsed.success) return fail(res);
    const now = clock();
    try {
      const bookings = await prisma.booking.findMany({ where: where(parsed.data, now), include, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
      const rows = bookings.map(b => { const r = present(b, now); return [r.bookingCode, r.eventTitle, r.customerName,
        r.customerEmail, r.tickets, r.amount, r.status, r.paymentStatus, r.createdAt]; });
      res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=bookings.csv" });
      return res.send([["Booking ID", "Event", "Customer", "Email", "Tickets", "Amount", "Status", "Payment", "Booked on"], ...rows]
        .map(row => row.map(csv).join(",")).join("\r\n") + "\r\n");
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not export bookings"); }
  });
  router.get("/", async (req, res) => {
    const parsed = listInput.safeParse(req.query);
    if (!parsed.success) return fail(res);
    const { page, pageSize } = parsed.data;
    const now = clock();
    try {
      const scoped = where(parsed.data, now);
      const [total, rows] = await prisma.$transaction([prisma.booking.count({ where: scoped }),
        prisma.booking.findMany({ where: scoped, include, skip: (page - 1) * pageSize, take: pageSize,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }] })], { isolationLevel: "RepeatableRead" });
      return res.json({ data: rows.map(b => present(b, now)), total, page, pageSize });
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load bookings"); }
  });
  router.get("/:id", async (req, res) => {
    const id = z.uuid().safeParse(req.params.id);
    if (!id.success) return fail(res);
    try {
      const data = await prisma.$transaction(async tx => {
        const b = await tx.booking.findUnique({ where: { id: id.data }, include });
        if (!b) return null;
        const payment = paymentFor(b);
        const log = await tx.activityLog.findFirst({ where: { entityType: "Booking", entityId: b.id, action: "BOOKING_PAYMENT_RECORDED" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
        const metadata = log?.metadata as { note?: string } | null;
        return { ...present(b, clock()), customerPhone: b.user.phoneNumber,
          eventStartsAt: (b.event.startTime ?? b.event.eventDate)?.toISOString() ?? null, eventVenue: b.event.venue?.name ?? "Not set",
          paymentMethod: payment?.paymentMethod ?? null, paidAt: payment?.paidAt?.toISOString() ?? null,
          refundedAt: payment?.refundedAt?.toISOString() ?? null, paymentNote: metadata?.note ?? null,
          items: b.items.map(item => ({ tier: item.ticketCategory.name, quantity: item.quantity, unitPrice: item.unitPrice.toNumber() })) };
      }, { isolationLevel: "RepeatableRead" });
      if (!data) return fail(res, 404, "NOT_FOUND", "Booking not found");
      return res.json(data);
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load booking details"); }
  });
  router.patch("/:id/payment", async (req, res) => {
    const id = z.uuid().safeParse(req.params.id);
    const input = paymentInput.safeParse(req.body);
    if (!id.success || !input.success) return fail(res);
    const now = clock();
    try {
      const result = await prisma.$transaction(async tx => {
        // Serialize payment decisions on the booking, including concurrent administrators.
        await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id.data}::uuid FOR UPDATE`;
        const b = await tx.booking.findUnique({ where: { id: id.data }, include });
        if (!b) return { error: "NOT_FOUND" } as const;
        const payment = paymentFor(b);
        const paid = input.data.paymentStatus === "paid";
        if (paid && b.payments.some(p => p.provider === "paymongo_test" && p.status === "PENDING")) return { error: "INVALID_TRANSITION" } as const;
        const status = bookingStatus(b, now);
        if (paid ? status !== "pending" || b.event.status === "CANCELLED" || b.event.status === "COMPLETED" || b.payments.some(p => p.status === "PAID" || p.status === "REFUNDED")
          : payment?.status !== "PAID" || status === "completed" || status === "refunded") return { error: "INVALID_TRANSITION" } as const;
        if (paid) {
          await tx.payment.create({ data: { bookingId: b.id, provider: "manual", paymentMethod: "Manual", amount: b.totalAmount, status: "PAID", paidAt: now } });
        } else {
          await tx.payment.updateMany({ where: { bookingId: b.id, status: "PAID" }, data: { status: "REFUNDED", refundedAt: now, refundStatus: "MANUALLY_RECORDED" } });
          await tx.ticket.updateMany({ where: { bookingItem: { bookingId: b.id } }, data: { status: "CANCELLED" } });
        }
        await tx.bookingSeat.updateMany({ where: { bookingItem: { bookingId: b.id }, allocationStatus: paid ? "HELD" : { in: ["HELD", "CONFIRMED"] } },
          data: { allocationStatus: paid ? "CONFIRMED" : "RELEASED", releasedAt: paid ? null : now } });
        await tx.booking.update({ where: { id: b.id }, data: { status: paid ? "CONFIRMED" : "REFUNDED" } });
        await tx.activityLog.create({ data: { userId: res.locals.user.id as string, action: "BOOKING_PAYMENT_RECORDED", entityType: "Booking", entityId: b.id,
          metadata: { previousStatus: b.status, paymentStatus: input.data.paymentStatus, note: input.data.note ?? null } } });
        return { data: present(await tx.booking.findUniqueOrThrow({ where: { id: b.id }, include }), now) };
      });
      if ("error" in result) return fail(res, result.error === "NOT_FOUND" ? 404 : 409, result.error,
        result.error === "NOT_FOUND" ? "Booking not found" : "This payment cannot be changed. Refresh the booking details.");
      return res.json(result.data);
    } catch { return fail(res, 500, "INTERNAL_ERROR", "The payment update could not be confirmed. Refresh before retrying."); }
  });
  return router;
}
