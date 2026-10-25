import { Router, type Response } from "express";
import { z } from "zod";
import type { Prisma, EventStatus } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { requireRoles } from "../lib/authorization.js";
import type { createAuth } from "../lib/auth.js";
import { env } from "../config/env.js";

const statuses = ["draft", "published", "sold_out", "completed", "cancelled"] as const;
const filters = z.object({ search: z.string().trim().max(100).optional(),
  status: z.enum(statuses).optional(), category: z.enum(["concert", "gig", "festival"]).optional() }).strict();
const listInput = filters.extend({ page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10) });
const changeInput = z.object({ status: z.enum(["draft", "published", "cancelled"]),
  expectedUpdatedAt: z.iso.datetime(), reason: z.string().trim().max(500).optional() }).strict();
const categoryMap = { concert: "CONCERT", gig: "GIG", festival: "MUSIC_FESTIVAL" } as const;
const transitions: Record<EventStatus, readonly string[]> = {
  DRAFT: ["published", "cancelled"], PUBLISHED: ["draft", "cancelled"],
  SOLD_OUT: ["draft", "cancelled"], COMPLETED: [], CANCELLED: ["draft"],
};
const include = {
  organizer: { include: { user: { select: { status: true, emailVerified: true } } } }, venue: true,
  ticketCategories: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: {
    _count: { select: { seats: { where: { enabled: true } } } },
    bookingItems: { where: { booking: { status: "CONFIRMED" } }, select: { quantity: true, subtotal: true } },
  } },
} satisfies Prisma.EventInclude;
type Row = Prisma.EventGetPayload<{ include: typeof include }>;
function where(filter: z.infer<typeof filters>): Prisma.EventWhereInput {
  const id = filter.search?.replace(/^EVT-/i, "");
  return { ...(filter.status ? { status: filter.status.toUpperCase() as EventStatus } : {}),
    ...(filter.category ? { eventType: categoryMap[filter.category] } : {}),
    ...(filter.search ? { OR: [
      { name: { contains: filter.search, mode: "insensitive" } },
      { organizer: { organizationName: { contains: filter.search, mode: "insensitive" } } },
      { venue: { name: { contains: filter.search, mode: "insensitive" } } },
      ...(id && z.uuid().safeParse(id).success ? [{ id }] : []),
    ] } : {}) };
}
function tiers(event: Row) {
  return event.ticketCategories.map(tier => ({ id: tier.id, name: tier.name, price: tier.price.toNumber(),
    sold: tier.bookingItems.reduce((sum, item) => sum + item.quantity, 0),
    capacity: tier.admissionMode === "ASSIGNED_SEATING"
      ? Math.min(tier._count.seats, tier.maxCapacity ?? tier._count.seats) : tier.maxCapacity,
  }));
}
function present(event: Row) {
  return { id: event.id, eventCode: `EVT-${event.id}`, title: event.name,
    organizerName: event.organizer.organizationName, startsAt: (event.startTime ?? event.eventDate)?.toISOString() ?? null,
    venue: event.venue?.name ?? "Not set", status: event.status.toLowerCase(),
    category: event.eventType === "MUSIC_FESTIVAL" ? "festival" : event.eventType?.toLowerCase() ?? null,
    attendees: tiers(event).reduce((sum, tier) => sum + tier.sold, 0), updatedAt: event.updatedAt.toISOString() };
}
function fail(res: Response, status = 400, code = "VALIDATION_ERROR", message = "Invalid event management input") {
  return res.status(status).json({ error: { code, message } });
}
function csv(value: unknown) {
  const raw = String(value ?? "");
  return `"${(/^\s*[=+\-@]/u.test(raw) ? `'${raw}` : raw).replaceAll('"', '""')}"`;
}

export function adminEventsRouter(auth: ReturnType<typeof createAuth>) {
  const router = Router();
  router.use(requireRoles(auth, ["ADMINISTRATOR"]));
  router.use((req, res, next) => {
    if (req.method === "PATCH") {
      if (req.get("Origin") !== env.FRONTEND_URL) { fail(res, 403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed"); return; }
      if (!req.is("application/json")) { fail(res, 415, "UNSUPPORTED_MEDIA_TYPE", "JSON content type is required"); return; }
    }
    next();
  });
  router.get("/stats", async (req, res) => {
    if (!z.object({}).strict().safeParse(req.query).success) return fail(res);
    try {
      const counts = await prisma.event.groupBy({ by: ["status"], _count: true });
      const count = (status: EventStatus) => counts.find(row => row.status === status)?._count ?? 0;
      return res.json({ data: { total: counts.reduce((sum, row) => sum + row._count, 0),
        published: count("PUBLISHED"), draft: count("DRAFT"), cancelled: count("CANCELLED"),
        soldOut: count("SOLD_OUT"), completed: count("COMPLETED") } });
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load event statistics"); }
  });
  router.get("/export", async (req, res) => {
    const parsed = filters.safeParse(req.query);
    if (!parsed.success) return fail(res);
    try {
      const events = await prisma.event.findMany({ where: where(parsed.data), include,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
      const rows = events.map(event => { const e = present(event);
        return [e.eventCode, e.title, e.organizerName, e.startsAt, e.venue, e.category, e.status, e.attendees]; });
      res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=events.csv" });
      return res.send([["Event ID", "Title", "Organizer", "Date", "Venue", "Category", "Status", "Attendees"], ...rows]
        .map(row => row.map(csv).join(",")).join("\r\n") + "\r\n");
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not export events"); }
  });
  router.get("/", async (req, res) => {
    const parsed = listInput.safeParse(req.query);
    if (!parsed.success) return fail(res);
    const { page, pageSize } = parsed.data;
    try {
      const scoped = where(parsed.data);
      const [total, events] = await prisma.$transaction([
        prisma.event.count({ where: scoped }), prisma.event.findMany({ where: scoped, include,
          skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
      ], { isolationLevel: "RepeatableRead" });
      return res.json({ data: events.map(present), total, page, pageSize });
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load events"); }
  });
  router.get("/:id", async (req, res) => {
    const id = z.uuid().safeParse(req.params.id);
    if (!id.success) return fail(res);
    try {
      const data = await prisma.$transaction(async tx => {
        const event = await tx.event.findUnique({ where: { id: id.data }, include });
        if (!event) return null;
        const ticketTiers = tiers(event);
        const latest = event.status === "CANCELLED" ? await tx.activityLog.findFirst({
          where: { entityType: "Event", entityId: event.id, action: "EVENT_STATUS_CHANGED" },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }) : null;
        const metadata = latest?.metadata as { status?: string; reason?: string } | null;
        return { ...present(event), description: event.description, tiers: ticketTiers,
          capacity: ticketTiers.some(tier => tier.capacity === null) ? null : ticketTiers.reduce((sum, tier) => sum + (tier.capacity ?? 0), 0),
          revenue: event.ticketCategories.reduce((sum, tier) => sum + tier.bookingItems.reduce((total, item) => total + item.subtotal.toNumber(), 0), 0),
          cancellationReason: metadata?.status === "CANCELLED" ? metadata.reason ?? null : null };
      }, { isolationLevel: "RepeatableRead" });
      if (!data) return fail(res, 404, "NOT_FOUND", "Event not found");
      return res.json({ data });
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load event details"); }
  });
  router.patch("/:id/status", async (req, res) => {
    const id = z.uuid().safeParse(req.params.id);
    const input = changeInput.safeParse(req.body);
    if (!id.success || !input.success) return fail(res);
    if (input.data.reason && input.data.status !== "cancelled") return fail(res);
    try {
      const result = await prisma.$transaction(async tx => {
        const event = await tx.event.findUnique({ where: { id: id.data }, include });
        if (!event) return { error: "NOT_FOUND" } as const;
        if (event.updatedAt.toISOString() !== input.data.expectedUpdatedAt) return { error: "STALE_EVENT" } as const;
        if (!transitions[event.status].includes(input.data.status)) return { error: "INVALID_TRANSITION" } as const;
        if (input.data.status === "published" && (!event.venue || !(event.startTime ?? event.eventDate) || !event.eventType ||
          event.organizer.approvalStatus !== "APPROVED" || event.organizer.user.status !== "ACTIVE" || !event.organizer.user.emailVerified ||
          !event.ticketCategories.some(tier => tier.status === "ACTIVE"))) return { error: "INCOMPLETE_EVENT" } as const;
        const status = input.data.status.toUpperCase() as EventStatus;
        // Compare-and-swap prevents two administrators from overwriting the same version.
        const updated = await tx.event.updateMany({ where: { id: event.id, updatedAt: event.updatedAt, status: event.status },
          data: { status, updatedAt: new Date(Math.max(Date.now(), event.updatedAt.getTime() + 1)) } });
        if (!updated.count) return { error: "STALE_EVENT" } as const;
        await tx.activityLog.create({ data: { userId: res.locals.user.id as string, action: "EVENT_STATUS_CHANGED",
          entityType: "Event", entityId: event.id, metadata: { previousStatus: event.status, status, reason: input.data.reason ?? null } } });
        return { data: present((await tx.event.findUniqueOrThrow({ where: { id: event.id }, include }))) };
      });
      if ("error" in result) {
        const messages = { NOT_FOUND: "Event not found", STALE_EVENT: "This event changed. Refresh before trying again.",
          INVALID_TRANSITION: "This status change is not available. Refresh the event details.",
          INCOMPLETE_EVENT: "Publishing requires a venue, date, category, active ticket tier, and an approved organizer with an active, verified account." };
        return fail(res, result.error === "NOT_FOUND" ? 404 : 409, result.error, messages[result.error]);
      }
      return res.json(result);
    } catch { return fail(res, 500, "INTERNAL_ERROR", "The event update could not be confirmed. Refresh before retrying."); }
  });
  return router;
}
