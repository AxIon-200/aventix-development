import { Router, type Response } from "express";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { requireRoles } from "../lib/authorization.js";
import type { createAuth } from "../lib/auth.js";

// Keep filtering and presentation on the same classification rules.
const authActions = ["PASSWORD_CHANGED", "PASSWORD_RESET", "LOGIN", "LOGOUT", "LOGIN_FAILED"];
const categoryRules: Record<string, Prisma.ActivityLogWhereInput> = {
  auth: { action: { in: authActions } },
  user: { entityType: "User", NOT: { action: { in: authActions } } },
  organizer: { entityType: "OrganizerProfile" },
  event: { entityType: "Event" },
  booking: { entityType: "Booking", NOT: { action: { startsWith: "BOOKING_PAYMENT_" } } },
  payment: { OR: [{ entityType: "Payment" }, { action: { startsWith: "BOOKING_PAYMENT_" } }] },
};
const failed: Prisma.ActivityLogWhereInput = { action: { endsWith: "_FAILED" } };
const filters = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.enum(["auth", "user", "organizer", "event", "booking", "payment", "system"]).optional(),
  result: z.enum(["success", "failed"]).optional(),
  from: z.iso.datetime().optional(), to: z.iso.datetime().optional(),
}).strict();
function validRange(f: z.infer<typeof filters>) { return !f.from || !f.to || Date.parse(f.from) <= Date.parse(f.to); }
const listInput = filters.extend({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
}).refine(validRange);
const filterInput = filters.refine(validRange);
const include = { user: { select: { name: true, email: true, role: true } } } satisfies Prisma.ActivityLogInclude;
type Row = Prisma.ActivityLogGetPayload<{ include: typeof include }>;
function metadata(row: Row): Prisma.JsonObject {
  return row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
}
function category(row: Row) {
  if (authActions.includes(row.action)) return "auth";
  if (row.action.startsWith("BOOKING_PAYMENT_") || row.entityType === "Payment") return "payment";
  return ({ User: "user", OrganizerProfile: "organizer", Event: "event", Booking: "booking" } as Record<string, string>)[row.entityType] ?? "system";
}
function present(row: Row) {
  return {
    id: row.id, logCode: `LOG-${row.id}`, occurredAt: row.createdAt.toISOString(),
    actorName: row.user?.name ?? "System / maintenance",
    actorRole: row.user?.role === "ADMINISTRATOR" ? "admin" : row.user?.role === "ORGANIZER" ? "organizer" : row.user ? "user" : "system",
    action: row.action.toLowerCase().replaceAll("_", " ").replace(/^./, c => c.toUpperCase()),
    targetLabel: `${row.entityType}${row.entityId ? ` (${row.entityId})` : ""}`,
    category: category(row), result: row.action.endsWith("_FAILED") ? "failed" : "success",
  };
}
function where(f: z.infer<typeof filters>): Prisma.ActivityLogWhereInput {
  const and: Prisma.ActivityLogWhereInput[] = [];
  if (f.category === "system") and.push({ NOT: { OR: Object.values(categoryRules) } });
  else if (f.category) and.push(categoryRules[f.category]!);
  if (f.result) and.push(f.result === "failed" ? failed : { NOT: failed });
  if (f.from || f.to) and.push({ createdAt: { ...(f.from ? { gte: new Date(f.from) } : {}), ...(f.to ? { lte: new Date(f.to) } : {}) } });
  if (f.search) {
    const id = f.search.replace(/^LOG-/i, "");
    and.push({ OR: [
      ...(z.uuid().safeParse(id).success ? [{ id }, { entityId: id }] : []),
      { action: { contains: f.search.replaceAll(" ", "_"), mode: "insensitive" } },
      { entityType: { contains: f.search, mode: "insensitive" } },
      { user: { name: { contains: f.search, mode: "insensitive" } } },
      { user: { email: { contains: f.search, mode: "insensitive" } } },
    ] });
  }
  return { AND: and };
}
function fail(res: Response, status = 400, code = "VALIDATION_ERROR", message = "Invalid activity log input") {
  return res.status(status).json({ error: { code, message } });
}
function csv(value: unknown) {
  const raw = String(value ?? "");
  return `"${(/^\s*[=+\-@]/u.test(raw) ? `'${raw}` : raw).replaceAll('"', '""')}"`;
}
export function adminActivityLogsRouter(auth: ReturnType<typeof createAuth>, now = () => new Date()) {
  const router = Router();
  router.use(requireRoles(auth, ["ADMINISTRATOR"]));
  router.get("/stats", async (req, res) => {
    const parsed = filterInput.safeParse(req.query);
    if (!parsed.success) return fail(res);
    try {
      const scoped = where(parsed.data);
      const [total, last24Hours, adminActions, failedCount] = await prisma.$transaction([
        prisma.activityLog.count({ where: scoped }),
        prisma.activityLog.count({ where: { AND: [scoped, { createdAt: { gte: new Date(now().getTime() - 86_400_000), lte: now() } }] } }),
        prisma.activityLog.count({ where: { AND: [scoped, { user: { role: "ADMINISTRATOR" } }] } }),
        prisma.activityLog.count({ where: { AND: [scoped, failed] } }),
      ], { isolationLevel: "RepeatableRead" });
      return res.json({ total, last24Hours, adminActions, failed: failedCount });
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load activity statistics"); }
  });
  router.get("/export", async (req, res) => {
    const parsed = filterInput.safeParse(req.query);
    if (!parsed.success) return fail(res);
    try {
      const rows = await prisma.activityLog.findMany({ where: where(parsed.data), include, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
      res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=activity-logs.csv" });
      return res.send([["Log ID", "Timestamp", "Actor", "Role", "Action", "Target", "Category", "Result"],
        ...rows.map(row => { const r = present(row); return [r.logCode, r.occurredAt, r.actorName, r.actorRole, r.action, r.targetLabel, r.category, r.result]; })]
        .map(row => row.map(csv).join(",")).join("\r\n") + "\r\n");
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not export activity logs"); }
  });
  router.get("/", async (req, res) => {
    const parsed = listInput.safeParse(req.query);
    if (!parsed.success) return fail(res);
    const { page, pageSize } = parsed.data;
    try {
      const scoped = where(parsed.data);
      const [total, rows] = await prisma.$transaction([
        prisma.activityLog.count({ where: scoped }),
        prisma.activityLog.findMany({ where: scoped, include, skip: (page - 1) * pageSize, take: pageSize,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
      ], { isolationLevel: "RepeatableRead" });
      return res.json({ data: rows.map(present), total, page, pageSize });
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load activity logs"); }
  });
  router.get("/:id", async (req, res) => {
    const id = z.uuid().safeParse(req.params.id);
    if (!id.success) return fail(res);
    try {
      const row = await prisma.activityLog.findUnique({ where: { id: id.data }, include });
      if (!row) return fail(res, 404, "NOT_FOUND", "Log entry not found");
      const r = present(row), meta = metadata(row);
      // Expose only supported audit fields; never return arbitrary metadata or secrets.
      const changes = typeof meta.previousStatus === "string" && typeof meta.status === "string"
        ? [{ field: "Status", from: meta.previousStatus, to: meta.status }] : [];
      return res.json({ ...r, actorEmail: row.user?.email ?? null,
        description: `${r.action}: ${r.targetLabel}.`, changes,
        ipAddress: null, userAgent: null, errorMessage: null });
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load log details"); }
  });
  return router;
}
