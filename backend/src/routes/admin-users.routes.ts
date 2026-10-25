import { randomUUID } from "node:crypto";
import { Router, type Response } from "express";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { requireRoles } from "../lib/authorization.js";
import type { createAuth } from "../lib/auth.js";

const filterInput = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(["active", "disabled"]).optional(),
}).strict();
const listInput = filterInput.extend({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
const statusInput = z.object({ status: z.enum(["active", "disabled"]) }).strict();
const userSelect = {
  id: true, name: true, email: true, emailVerified: true, status: true,
  createdAt: true, image: true,
} satisfies Prisma.UserSelect;
type SelectedUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function attendeeWhere(filter: z.infer<typeof filterInput>): Prisma.UserWhereInput {
  const search = filter.search;
  const idSearch = search?.replace(/^USR-/i, "");
  return {
    role: "ATTENDEE",
    ...(filter.status ? { status: filter.status.toUpperCase() } : {}),
    ...(search ? { OR: [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      ...(idSearch && z.uuid().safeParse(idSearch).success ? [{ id: idSearch }] : []),
    ] } : {}),
  };
}

function present(user: SelectedUser) {
  return {
    id: user.id, userCode: `USR-${user.id}`, name: user.name, email: user.email,
    emailVerified: user.emailVerified, status: user.status === "ACTIVE" ? "active" : "disabled",
    joinedAt: user.createdAt.toISOString(), avatarUrl: user.image,
  };
}

function fail(res: Response, status = 400, code = "VALIDATION_ERROR", message = "Invalid attendee management input") {
  return res.status(status).json({ error: { code, message } });
}
function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^\s*[=+\-@]/u.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function adminUsersRouter(auth: ReturnType<typeof createAuth>, now: () => Date = () => new Date()) {
  const router = Router();
  router.use(requireRoles(auth, ["ADMINISTRATOR"]));
  router.use((req, res, next) => {
    if (req.method === "PATCH") {
      if (req.get("Origin") !== env.FRONTEND_URL) {
        fail(res, 403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed");
        return;
      }
      if (!req.is("application/json")) {
        fail(res, 415, "UNSUPPORTED_MEDIA_TYPE", "JSON content type is required");
        return;
      }
    }
    next();
  });

  // Cards describe all attendee accounts, independently of the table filters.
  router.get("/stats", async (req, res) => {
    if (!z.object({}).strict().safeParse(req.query).success) return fail(res);
    const end = now();
    const start = new Date(end.getTime() - 30 * 86_400_000);
    try {
      const [total, active, newLast30Days, withBookings] = await prisma.$transaction([
        prisma.user.count({ where: { role: "ATTENDEE" } }),
        prisma.user.count({ where: { role: "ATTENDEE", status: "ACTIVE" } }),
        prisma.user.count({ where: { role: "ATTENDEE", createdAt: { gte: start, lte: end } } }),
        prisma.user.count({ where: { role: "ATTENDEE", bookings: { some: { status: "CONFIRMED" } } } }),
      ], { isolationLevel: "RepeatableRead" });
      return res.json({ data: { total, active, newLast30Days, withBookings } });
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load attendee statistics"); }
  });

  router.get("/export", async (req, res) => {
    const parsed = filterInput.safeParse(req.query);
    if (!parsed.success) return fail(res);
    try {
      const users = await prisma.user.findMany({ where: attendeeWhere(parsed.data), select: userSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
      const rows = users.map(user => {
        const row = present(user);
        return [row.userCode, row.name, row.email, row.status, row.emailVerified ? "Verified" : "Unverified", row.joinedAt];
      });
      res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=attendees.csv" });
      return res.send([["User ID", "Name", "Email", "Account Status", "Email Verification", "Date Joined"], ...rows]
        .map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n");
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not export attendees"); }
  });

  router.get("/", async (req, res) => {
    const parsed = listInput.safeParse(req.query);
    if (!parsed.success) return fail(res);
    const { page, pageSize } = parsed.data;
    const where = attendeeWhere(parsed.data);
    try {
      const [total, users] = await prisma.$transaction([
        prisma.user.count({ where }),
        prisma.user.findMany({ where, select: userSelect, skip: (page - 1) * pageSize, take: pageSize,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
      ], { isolationLevel: "RepeatableRead" });
      return res.json({ data: users.map(present), total, page, pageSize });
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load attendees"); }
  });

  router.get("/:id", async (req, res) => {
    const id = z.uuid().safeParse(req.params.id);
    if (!id.success) return fail(res);
    try {
      const user = await prisma.user.findFirst({ where: { id: id.data, role: "ATTENDEE" },
        select: { ...userSelect, phoneNumber: true, _count: { select: { bookings: true } } } });
      if (!user) return fail(res, 404, "NOT_FOUND", "Attendee not found");
      const tickets = await prisma.bookingItem.aggregate({
        where: { booking: { userId: id.data, status: "CONFIRMED" } }, _sum: { quantity: true },
      });
      return res.json({ data: { ...present(user), phone: user.phoneNumber,
        totalBookings: user._count.bookings, ticketsPurchased: tickets._sum.quantity ?? 0 } });
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load attendee details"); }
  });

  router.patch("/:id/status", async (req, res) => {
    const id = z.uuid().safeParse(req.params.id);
    const parsed = statusInput.safeParse(req.body);
    if (!id.success || !parsed.success) return fail(res);
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          const updated = await prisma.$transaction(async tx => {
            // Share the account lifecycle lock with login/password/maintenance operations.
            // Scoping the lock prevents this endpoint from changing organizers or administrators.
            const previous = await tx.user.update({ where: { id: id.data, role: "ATTENDEE" },
              data: { lifecycleLock: randomUUID() }, select: { status: true } });
            const status = parsed.data.status === "active" ? "ACTIVE" : "DISABLED";
            const user = await tx.user.update({ where: { id: id.data }, data: { status }, select: userSelect });
            await tx.session.deleteMany({ where: { userId: id.data } });
            await tx.activityLog.create({ data: {
              userId: res.locals.user.id as string,
              action: status === "DISABLED" ? "ACCOUNT_DISABLED" : "ACCOUNT_REENABLED",
              entityType: "User", entityId: id.data,
              metadata: { previousStatus: previous.status, status },
            } });
            return user;
          });
          return res.json({ data: present(updated) });
        } catch (error) {
          if (error instanceof Error && "code" in error) {
            if (error.code === "P2034" && attempt < 2) continue;
            if (error.code === "P2025") return fail(res, 404, "NOT_FOUND", "Attendee not found");
          }
          throw error;
        }
      }
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not update the attendee account. Refresh before retrying."); }
  });
  return router;
}
