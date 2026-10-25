import { Router } from "express";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { requireRoles } from "../lib/authorization.js";
import type { createAuth } from "../lib/auth.js";

const DAY = 86_400_000;
const emptyQuery = z.object({}).strict();
const salesQuery = z.object({ range: z.enum(["7d", "30d", "90d"]).default("30d") }).strict();
const orderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];
function change(count: number, label = "created in last 30 days") {
  return { value: `+${count.toLocaleString("en-US")}`, direction: count ? "up" : "neutral", label };
}
async function stats(now: Date) {
  const recent = { gte: new Date(now.getTime() - 30 * DAY), lte: now };
  const nextMonth = new Date(now.getTime() + 30 * DAY);
  const upcoming: Prisma.EventWhereInput = { status: { in: ["PUBLISHED", "SOLD_OUT"] }, OR: [
    { startTime: { gt: now, lte: nextMonth } },
    { startTime: null, eventDate: { gt: now, lte: nextMonth } },
  ] };
  const [users, newUsers, organizers, newOrganizers, events, newEvents, upcomingEvents,
    bookings, newBookings, tickets, newTickets, revenue, newRevenue, activity] = await prisma.$transaction([
    prisma.user.count(), prisma.user.count({ where: { createdAt: recent } }),
    prisma.organizerProfile.count(), prisma.organizerProfile.count({ where: { createdAt: recent } }),
    prisma.event.count(), prisma.event.count({ where: { createdAt: recent } }), prisma.event.count({ where: upcoming }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "CONFIRMED", createdAt: recent } }),
    prisma.bookingItem.aggregate({ where: { booking: { status: "CONFIRMED" } }, _sum: { quantity: true } }),
    prisma.bookingItem.aggregate({ where: { booking: { status: "CONFIRMED", createdAt: recent } }, _sum: { quantity: true } }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: "PAID", OR: [{ paidAt: recent }, { paidAt: null, createdAt: recent }] }, _sum: { amount: true } }),
    prisma.activityLog.count({ where: { createdAt: { gte: new Date(now.getTime() - DAY), lte: now } } }),
  ], { isolationLevel: "RepeatableRead" });
  return { totalUsers: users, totalUsersChange: change(newUsers),
    totalOrganizers: organizers, totalOrganizersChange: change(newOrganizers),
    totalEvents: events, totalEventsChange: change(newEvents), upcomingEvents,
    upcomingEventsChange: { value: "next 30 days", direction: "neutral", label: "published or sold out" },
    confirmedBookings: bookings, confirmedBookingsChange: change(newBookings, "booked in last 30 days"),
    ticketsSold: tickets._sum.quantity ?? 0, ticketsSoldChange: change(newTickets._sum.quantity ?? 0, "booked in last 30 days"),
    recordedRevenue: revenue._sum.amount?.toNumber() ?? 0,
    recordedRevenueChange: { ...change(newRevenue._sum.amount?.toNumber() ?? 0, "paid in last 30 days"), value: `₱${(newRevenue._sum.amount?.toNumber() ?? 0).toLocaleString("en-US")}` },
    recentActivityCount: activity, recentActivityChange: { value: "last 24 hours", direction: "neutral", label: "recorded activity logs" } };
}

export function adminDashboardRouter(auth: ReturnType<typeof createAuth>, clock = () => new Date()) {
  const router = Router();
  router.use(requireRoles(auth, ["ADMINISTRATOR"]));
  router.use((req, res, next) => {
    const parsed = (req.path === "/sales" ? salesQuery : emptyQuery).safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid dashboard query" } }); return; }
    next();
  });
  router.get("/stats", async (_req, res) => res.json(await stats(clock())));
  router.get("/sales", async (req, res) => {
    const { range } = salesQuery.parse(req.query);
    const days = Number(range.slice(0, -1));
    const now = clock();
    // Calendar dates and bucket boundaries use Philippine time, including empty days.
    const today = new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);
    const start = new Date(new Date(`${today}T00:00:00+08:00`).getTime() - (days - 1) * DAY);
    const rows = await prisma.$queryRaw<Array<{ date: string; ticketsSold: number; revenue: number }>>(Prisma.sql`
      WITH sales AS (
        SELECT (b."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date AS day,
          SUM(i.quantity)::numeric AS tickets, 0::numeric AS revenue
        FROM "BookingItem" i JOIN "Booking" b ON b.id = i."bookingId"
        WHERE b.status = 'CONFIRMED' AND b."createdAt" >= ${start} AND b."createdAt" <= ${now}
        GROUP BY 1
        UNION ALL
        SELECT (COALESCE(p."paidAt", p."createdAt") AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date,
          0::numeric, SUM(p.amount)
        FROM "Payment" p WHERE p.status = 'PAID'
          AND COALESCE(p."paidAt", p."createdAt") >= ${start} AND COALESCE(p."paidAt", p."createdAt") <= ${now}
        GROUP BY 1
      ) SELECT day::text AS date, SUM(tickets)::float8 AS "ticketsSold", SUM(revenue)::float8 AS revenue
        FROM sales GROUP BY day ORDER BY day
    `);
    const byDate = new Map(rows.map(row => [row.date, row]));
    return res.json(Array.from({ length: days }, (_, index) => {
      const date = new Date(start.getTime() + index * DAY + 8 * 3_600_000).toISOString().slice(0, 10);
      return { date, label: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        ticketsSold: byDate.get(date)?.ticketsSold ?? 0, revenue: byDate.get(date)?.revenue ?? 0 };
    }));
  });
  router.get("/booking-status", async (_req, res) => {
    const now = clock();
    const rows = await prisma.$queryRaw<Array<{ status: string; count: number }>>(Prisma.sql`
      SELECT CASE WHEN b.status = 'PENDING_PAYMENT' THEN CASE WHEN b."expiresAt" <= ${now} THEN 'expired' ELSE 'pending' END
        WHEN b.status = 'CONFIRMED' AND e.status = 'COMPLETED' THEN 'completed'
        ELSE lower(b.status::text) END AS status, COUNT(*)::float8 AS count
      FROM "Booking" b JOIN "Event" e ON e.id = b."eventId" GROUP BY 1
    `);
    const counts = { confirmed: 0, completed: 0, pending: 0, cancelled: 0, expired: 0, refunded: 0 };
    for (const row of rows) if (Object.hasOwn(counts, row.status)) counts[row.status as keyof typeof counts] = row.count;
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    return res.json({ ...counts, total });
  });
  router.get("/recent-events", async (_req, res) => {
    const events = await prisma.event.findMany({ take: 5, orderBy,
      select: { id: true, name: true, startTime: true, eventDate: true, status: true } });
    return res.json(events.map(e => ({ id: e.id, title: e.name, date: (e.startTime ?? e.eventDate)?.toISOString() ?? null, status: e.status.toLowerCase() })));
  });
  router.get("/recent-users", async (_req, res) => {
    const users = await prisma.user.findMany({ take: 5, orderBy, select: { id: true, name: true, email: true, createdAt: true } });
    return res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, joinedAt: u.createdAt.toISOString() })));
  });
  router.get("/recent-bookings", async (_req, res) => {
    const now = clock();
    const bookings = await prisma.booking.findMany({ take: 5, orderBy, select: { id: true, status: true, expiresAt: true, createdAt: true,
      event: { select: { name: true, status: true } }, user: { select: { name: true } } } });
    return res.json(bookings.map(b => ({ id: b.id, eventTitle: b.event.name, userName: b.user.name,
      status: b.status === "PENDING_PAYMENT" ? (b.expiresAt <= now ? "expired" : "pending")
        : b.status === "CONFIRMED" && b.event.status === "COMPLETED" ? "completed" : b.status.toLowerCase(),
      createdAt: b.createdAt.toISOString() })));
  });
  router.get("/export", async (_req, res) => {
    const now = clock();
    const data = await stats(now);
    const rows = [["Metric", "Value", "As of"], ...[
      ["Total users", data.totalUsers], ["Total organizers", data.totalOrganizers], ["Total events", data.totalEvents],
      ["Upcoming events (next 30 days)", data.upcomingEvents], ["Confirmed bookings (includes completed events)", data.confirmedBookings],
      ["Tickets in confirmed bookings", data.ticketsSold], ["Paid revenue (PHP, excludes refunds)", data.recordedRevenue],
      ["Activity logs (last 24 hours)", data.recentActivityCount],
    ].map(row => [...row, now.toISOString()])];
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=dashboard-report.csv" });
    return res.send(rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n") + "\r\n");
  });
  router.use(((error, _req, res, _next) => {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Could not load dashboard data" } });
  }) satisfies import("express").ErrorRequestHandler);
  return router;
}
