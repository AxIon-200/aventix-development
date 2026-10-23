import { Router } from "express";
import type { Response } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import { z } from "zod";
import { prisma } from "./prisma.js";
import { requireRoles } from "./authorization.js";
import type { createAuth } from "./auth.js";
import type { RegistrationOptions } from "./registration.js";
import { decideOrganization, retryDecisionEmail } from "./organizer-decision.js";

const filterInput = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(["awaiting-verification", "pending", "approved", "rejected", "suspended"]).optional(),
}).strict();
const listInput = filterInput.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
const idInput = z.uuid();
type Filter = z.infer<typeof filterInput>;

function searchScope(search?: string): Prisma.OrganizerProfileWhereInput {
  if (!search) return {};
  return { OR: [
    { organizationName: { contains: search, mode: "insensitive" } },
    { application: { is: { firstName: { contains: search, mode: "insensitive" } } } },
    { application: { is: { lastName: { contains: search, mode: "insensitive" } } } },
    { application: { is: { email: { contains: search, mode: "insensitive" } } } },
    { user: { firstName: { contains: search, mode: "insensitive" } } },
    { user: { lastName: { contains: search, mode: "insensitive" } } },
    { user: { email: { contains: search, mode: "insensitive" } } },
  ] };
}

function statusScope(status?: Filter["status"]): Prisma.OrganizerProfileWhereInput {
  if (status === "awaiting-verification") return { approvalStatus: "PENDING", user: { emailVerified: false } };
  if (status === "pending") return { approvalStatus: "PENDING", user: { emailVerified: true } };
  if (status) return { approvalStatus: status.toUpperCase() as "APPROVED" | "REJECTED" | "SUSPENDED" };
  return {};
}

function where(filter: Filter): Prisma.OrganizerProfileWhereInput {
  return { AND: [{ user: { role: "ORGANIZER" } }, searchScope(filter.search), statusScope(filter.status)] };
}

function classification(profile: { approvalStatus: string; user: { emailVerified: boolean } }) {
  return profile.approvalStatus === "PENDING"
    ? profile.user.emailVerified ? "pending" : "awaiting-verification"
    : profile.approvalStatus.toLowerCase();
}

function badInput(res: Response) {
  res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid organizer review input" } });
}

function csvCell(value: unknown) {
  const raw = value == null ? "" : value instanceof Date ? value.toISOString() : String(value);
  // Prefix attacker-controlled spreadsheet formulas, including after leading whitespace.
  const safe = /^[\s]*[=+\-@]/u.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function organizerReviewRouter(auth: ReturnType<typeof createAuth>, options: RegistrationOptions) {
  const router = Router();
  router.use(requireRoles(auth, ["ADMINISTRATOR"]));
  router.use((req, res, next) => {
    if (["PATCH", "POST"].includes(req.method) && req.get("Origin") !== process.env.FRONTEND_URL) {
      res.status(403).json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Request origin is not allowed" } });
      return;
    }
    next();
  });

  router.get("/stats", async (req, res) => {
    const parsed = filterInput.pick({ search: true }).safeParse(req.query);
    if (!parsed.success) return badInput(res);
    try {
      const search = parsed.data.search;
      const [awaitingVerification, pending, approved, rejected, suspended] = await Promise.all([
        prisma.organizerProfile.count({ where: where({ search, status: "awaiting-verification" }) }),
        prisma.organizerProfile.count({ where: where({ search, status: "pending" }) }),
        prisma.organizerProfile.count({ where: where({ search, status: "approved" }) }),
        prisma.organizerProfile.count({ where: where({ search, status: "rejected" }) }),
        prisma.organizerProfile.count({ where: where({ search, status: "suspended" }) }),
      ]);
      res.json({ data: { total: awaitingVerification + pending + approved + rejected + suspended,
        awaitingVerification, pending, approved, rejected, suspended } });
    } catch { res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } }); }
  });

  router.get("/export", async (req, res) => {
    const parsed = filterInput.safeParse(req.query);
    if (!parsed.success) return badInput(res);
    try {
      const profiles = await prisma.organizerProfile.findMany({ where: where(parsed.data),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: { user: true, application: true, decisions: { orderBy: { version: "desc" }, take: 1 } } });
      const header = ["Profile ID", "Organization", "Submitted first name", "Submitted last name", "Submitted email",
        "Submitted phone", "Description", "Current email", "Review status", "Submitted at", "Decision at"];
      const rows = profiles.map(profile => [profile.id, profile.application?.organizationName ?? profile.organizationName,
        profile.application?.firstName, profile.application?.lastName, profile.application?.email,
        profile.application?.phoneNumber, profile.application?.organizationDescription,
        profile.user.email, classification(profile), profile.application?.submittedAt,
        profile.decisions[0]?.decidedAt].map(csvCell).join(","));
      res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=organizers.csv" });
      res.send([header.map(csvCell).join(","), ...rows].join("\r\n") + "\r\n");
    } catch { res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } }); }
  });

  router.get("/", async (req, res) => {
    const parsed = listInput.safeParse(req.query);
    if (!parsed.success) return badInput(res);
    try {
      const { page, pageSize } = parsed.data;
      const scoped = where(parsed.data);
      const [total, profiles] = await Promise.all([
        prisma.organizerProfile.count({ where: scoped }),
        prisma.organizerProfile.findMany({ where: scoped, skip: (page - 1) * pageSize, take: pageSize,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: { user: { select: { firstName: true, lastName: true, email: true, emailVerified: true } },
            application: { select: { submittedAt: true } }, _count: { select: { events: true } } } }),
      ]);
      res.json({ data: profiles.map(profile => ({ id: profile.id, organizationName: profile.organizationName,
        applicantName: `${profile.user.firstName} ${profile.user.lastName}`,
        email: profile.user.email, status: classification(profile), version: profile.decisionVersion,
        submittedAt: profile.application?.submittedAt ?? null, eventsCount: profile._count.events })),
      total, page, pageSize });
    } catch { res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } }); }
  });

  router.get("/:id", async (req, res) => {
    if (!idInput.safeParse(req.params.id).success) return badInput(res);
    try {
      const profile = await prisma.organizerProfile.findUnique({ where: { id: req.params.id as string },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true,
          phoneNumber: true, emailVerified: true, status: true } }, application: true,
          decisions: { orderBy: { version: "desc" }, include: { notification: true } },
          events: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5,
            select: { id: true, name: true, status: true, eventDate: true, createdAt: true } } } });
      if (!profile) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Organizer not found" } }); return; }
      res.json({ data: { id: profile.id, organizationName: profile.organizationName,
        currentContact: profile.user, application: profile.application, status: classification(profile),
        version: profile.decisionVersion, approvedAt: profile.approvedAt,
        decisions: profile.decisions.map(decision => ({ id: decision.id, actorId: decision.actorId,
          previousStatus: decision.previousStatus, resultingStatus: decision.resultingStatus,
          reason: decision.reason, version: decision.version, decidedAt: decision.decidedAt,
          emailStatus: decision.notification?.status ?? "PENDING", emailAttempts: decision.notification?.attempts ?? 0 })),
        recentEvents: profile.events.map(event => ({ id: event.id, name: event.name,
          status: event.status, eventDate: event.eventDate, createdAt: event.createdAt })) } });
    } catch { res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } }); }
  });

  router.patch("/:id/status", async (req, res) => {
    await decideOrganization(req, res, res.locals.user.id as string, options);
  });
  router.post("/:id/decisions/:decisionId/retry-email", async (req, res) => {
    await retryDecisionEmail(req, res, options);
  });
  return router;
}
