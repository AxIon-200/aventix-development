import { Router, type Response } from "express";
import { z } from "zod";
import type { Prisma, PaymentStatus } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { requireRoles } from "../lib/authorization.js";
import type { createAuth } from "../lib/auth.js";

const filters = z.object({ search: z.string().trim().max(100).optional(),
  status: z.enum(["paid", "pending", "failed", "refunded"]).optional() }).strict();
const listInput = filters.extend({ page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10) });
const include = { booking: { select: { bookingReference: true,
  user: { select: { name: true, email: true } }, event: { select: { name: true } },
} } } satisfies Prisma.PaymentInclude;
type Row = Prisma.PaymentGetPayload<{ include: typeof include }>;
function present(p: Row) {
  return { id: p.id, paymentCode: `PAY-${p.id}`, userName: p.booking.user.name,
    methodLabel: p.paymentMethod ?? p.provider, amount: p.amount.toNumber(),
    status: p.status.toLowerCase(), createdAt: p.createdAt.toISOString() };
}
function where(f: z.infer<typeof filters>): Prisma.PaymentWhereInput {
  const search = f.search?.replace(/^PAY-/i, "");
  return { ...(f.status ? { status: f.status.toUpperCase() as PaymentStatus } : {}),
    ...(f.search ? { OR: [
      ...(search && z.uuid().safeParse(search).success ? [{ id: search }] : []),
      { paymentMethod: { contains: f.search, mode: "insensitive" as const } },
      { provider: { contains: f.search, mode: "insensitive" as const } },
      { providerReference: { contains: f.search, mode: "insensitive" as const } },
      { booking: { user: { name: { contains: f.search, mode: "insensitive" as const } } } },
      { booking: { user: { email: { contains: f.search, mode: "insensitive" as const } } } },
      { booking: { bookingReference: { contains: f.search, mode: "insensitive" as const } } },
      { booking: { event: { name: { contains: f.search, mode: "insensitive" as const } } } },
    ] } : {}) };
}
function fail(res: Response, status = 400, code = "VALIDATION_ERROR", message = "Invalid payment management input") {
  return res.status(status).json({ error: { code, message } });
}
function csv(value: unknown) {
  const raw = String(value ?? "");
  return `"${(/^\s*[=+\-@]/u.test(raw) ? `'${raw}` : raw).replaceAll('"', '""')}"`;
}
export function adminPaymentsRouter(auth: ReturnType<typeof createAuth>) {
  const router = Router();
  router.use(requireRoles(auth, ["ADMINISTRATOR"]));
  router.get("/stats", async (req, res) => {
    const parsed = filters.safeParse(req.query);
    if (!parsed.success) return fail(res);
    try {
      const scoped = where(parsed.data);
      const [total, paid, pending, value] = await prisma.$transaction([
        prisma.payment.count({ where: scoped }),
        prisma.payment.count({ where: { AND: [scoped, { status: "PAID" }] } }),
        prisma.payment.count({ where: { AND: [scoped, { status: "PENDING" }] } }),
        prisma.payment.aggregate({ where: scoped, _sum: { amount: true } }),
      ], { isolationLevel: "RepeatableRead" });
      return res.json({ total, paid, pending, recordedValue: value._sum.amount?.toNumber() ?? 0 });
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load payment statistics"); }
  });
  router.get("/export", async (req, res) => {
    const parsed = filters.safeParse(req.query);
    if (!parsed.success) return fail(res);
    try {
      const payments = await prisma.payment.findMany({ where: where(parsed.data), include,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
      const rows = payments.map(p => { const r = present(p); return [r.paymentCode, r.userName, r.methodLabel, r.amount, r.status, r.createdAt]; });
      res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=payments.csv" });
      return res.send([["Payment ID", "User", "Payment Method", "Amount", "Status", "Date"], ...rows]
        .map(row => row.map(csv).join(",")).join("\r\n") + "\r\n");
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not export payments"); }
  });
  router.get("/", async (req, res) => {
    const parsed = listInput.safeParse(req.query);
    if (!parsed.success) return fail(res);
    const { page, pageSize } = parsed.data;
    try {
      const scoped = where(parsed.data);
      const [total, rows] = await prisma.$transaction([prisma.payment.count({ where: scoped }),
        prisma.payment.findMany({ where: scoped, include, skip: (page - 1) * pageSize, take: pageSize,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }] })], { isolationLevel: "RepeatableRead" });
      return res.json({ data: rows.map(present), total, page, pageSize });
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load payments"); }
  });
  router.get("/:id", async (req, res) => {
    const id = z.uuid().safeParse(req.params.id);
    if (!id.success) return fail(res);
    try {
      const p = await prisma.payment.findUnique({ where: { id: id.data }, include });
      if (!p) return fail(res, 404, "NOT_FOUND", "Payment not found");
      const timeline = [{ label: "Payment initiated", at: p.createdAt.toISOString() }];
      if (p.paidAt) timeline.push({ label: "Payment captured", at: p.paidAt.toISOString() });
      if (p.refundedAt) timeline.push({ label: "Payment refunded", at: p.refundedAt.toISOString() });
      timeline.sort((a, b) => a.at.localeCompare(b.at));
      return res.json({ ...present(p), userEmail: p.booking.user.email, bookingCode: p.booking.bookingReference,
        eventTitle: p.booking.event.name, reference: p.providerReference ?? "Not recorded", timeline });
    } catch { return fail(res, 500, "INTERNAL_ERROR", "Could not load payment details"); }
  });
  return router;
}
