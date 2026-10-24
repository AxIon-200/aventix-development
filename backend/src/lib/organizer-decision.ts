import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "./prisma.js";
import type { RegistrationOptions } from "./registration.js";
import { sendOrganizerDecisionEmail } from "./organizer-decision-email.js";
import type { OrganizerDecisionKind } from "./organizer-decision-email.js";

const reasonInput = z.string().trim().refine(value => value.isWellFormed()
  && !value.includes("\u0000") && [...value].length >= 1 && [...value].length <= 500);
const decisionInput = z.object({
  status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
  version: z.number().int().nonnegative(),
  reason: reasonInput.optional(),
}).strict();
const emptyInput = z.object({}).strict();

class ReviewError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

function sendError(res: Response, error: unknown) {
  if (error instanceof ReviewError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } });
}

const transitionKind = (previous: string, next: string): OrganizerDecisionKind | null => {
  if (previous === "PENDING" && next === "APPROVED") return "APPROVED";
  if (previous === "PENDING" && next === "REJECTED") return "REJECTED";
  if (previous === "APPROVED" && next === "SUSPENDED") return "SUSPENDED";
  if (previous === "SUSPENDED" && next === "APPROVED") return "REINSTATED";
  return null;
};

async function dispatchDecisionEmail(decisionId: string, options: RegistrationOptions) {
  const now = options.now();
  const claimed = await prisma.organizerDecisionNotification.updateMany({
    where: { decisionId, OR: [{ status: { in: ["PENDING", "FAILED", "UNCERTAIN"] } },
      { status: "SENDING", claimedAt: { lt: new Date(now.getTime() - 10 * 60_000) } }] },
    data: { status: "SENDING", claimedAt: now, attemptedAt: now, attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) {
    const current = await prisma.organizerDecisionNotification.findUniqueOrThrow({ where: { decisionId } });
    return current.status;
  }
  try {
    return await prisma.$transaction(async tx => {
      const decision = await tx.organizerDecision.findUniqueOrThrow({ where: { id: decisionId },
        include: { organizerProfile: { include: { user: { select: { email: true, id: true } } } } } });
      // A decision needs an exclusive update of this user row. The shared lock
      // prevents a newer decision from committing during provider handoff.
      await tx.$queryRaw`SELECT id FROM public."user" WHERE id = ${decision.organizerProfile.userId}::uuid FOR SHARE`;
      const current = await tx.organizerProfile.findUniqueOrThrow({ where: { id: decision.organizerProfileId } });
      if (current.decisionVersion !== decision.version || current.approvalStatus !== decision.resultingStatus) {
        await tx.organizerDecisionNotification.update({ where: { decisionId }, data: { status: "SUPERSEDED" } });
        return "SUPERSEDED" as const;
      }
      const kind = transitionKind(decision.previousStatus, decision.resultingStatus);
      if (!kind) throw new Error("Invalid persisted decision transition");
      let status: "ACCEPTED" | "UNCERTAIN" = "ACCEPTED";
      try {
        await (options.sendOrganizerDecisionEmail ?? sendOrganizerDecisionEmail)({
          to: decision.organizerProfile.user.email, kind, ...(decision.reason ? { reason: decision.reason } : {}),
        });
      } catch { status = "UNCERTAIN"; }
      await tx.organizerDecisionNotification.update({ where: { decisionId }, data: { status } });
      return status;
    });
  } catch {
    await prisma.organizerDecisionNotification.updateMany({ where: { decisionId, status: "SENDING" },
      data: { status: "UNCERTAIN" } }).catch(() => {});
    return "UNCERTAIN" as const;
  }
}

export async function decideOrganization(req: Request, res: Response, actorId: string, options: RegistrationOptions) {
  const id = z.uuid().safeParse(req.params.id);
  const parsed = decisionInput.safeParse(req.body);
  if (!id.success || !parsed.success || ((parsed.data?.status === "REJECTED" || parsed.data?.status === "SUSPENDED")
    && !parsed.data.reason)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "A valid decision, version, and required reason are needed" } });
    return;
  }
  const { status, version, reason } = parsed.data;
  try {
    let committed: { decisionId: string; version: number } | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        committed = await prisma.$transaction(async tx => {
          const candidate = await tx.organizerProfile.findUnique({ where: { id: id.data }, select: { userId: true } });
          if (!candidate) throw new ReviewError(404, "NOT_FOUND", "Organizer not found");
          await tx.user.update({ where: { id: candidate.userId }, data: { lifecycleLock: randomUUID() } });
          const profile = await tx.organizerProfile.findUniqueOrThrow({ where: { id: id.data },
            include: { user: { select: { emailVerified: true } } } });
          if (profile.decisionVersion !== version) throw new ReviewError(409, "STALE_DECISION", "Refresh this organization before deciding");
          const kind = transitionKind(profile.approvalStatus, status);
          if (!kind) throw new ReviewError(409, "INVALID_TRANSITION", "This status transition is not allowed");
          if (profile.approvalStatus === "PENDING" && !profile.user.emailVerified) {
            throw new ReviewError(409, "EMAIL_VERIFICATION_REQUIRED", "Verify the applicant email before deciding");
          }
          const now = options.now();
          const nextVersion = version + 1;
          await tx.organizerProfile.update({ where: { id: id.data }, data: {
            approvalStatus: status, decisionVersion: nextVersion,
            ...(status === "APPROVED" ? { approvedAt: now, approvedById: actorId } : {}),
          } });
          const decisionId = randomUUID();
          await tx.organizerDecision.create({ data: { id: decisionId, organizerProfileId: id.data,
            actorId, previousStatus: profile.approvalStatus, resultingStatus: status,
            reason: reason ?? null, version: nextVersion, decidedAt: now,
            notification: { create: { id: randomUUID(), status: "PENDING", updatedAt: now } } } });
          await tx.activityLog.create({ data: { action: `ORGANIZATION_${kind}`,
            entityType: "OrganizerProfile", entityId: id.data, userId: actorId,
            metadata: { previousStatus: profile.approvalStatus, status, version: nextVersion, decisionId } } });
          if (status === "SUSPENDED") await tx.session.deleteMany({ where: { userId: candidate.userId } });
          return { decisionId, version: nextVersion };
        });
        break;
      } catch (error) {
        if (attempt < 2 && error instanceof Error && "code" in error && error.code === "P2034") continue;
        throw error;
      }
    }
    if (!committed) throw new Error("Decision did not commit");
    const emailStatus = await dispatchDecisionEmail(committed.decisionId, options);
    res.json({ data: { status, version: committed.version, decisionId: committed.decisionId, emailStatus } });
  } catch (error) { sendError(res, error); }
}

export async function retryDecisionEmail(req: Request, res: Response, options: RegistrationOptions) {
  const id = z.uuid().safeParse(req.params.id);
  const decisionId = z.uuid().safeParse(req.params.decisionId);
  if (!id.success || !decisionId.success || !emptyInput.safeParse(req.body ?? {}).success) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid decision email retry" } });
    return;
  }
  try {
    const decision = await prisma.organizerDecision.findUnique({ where: { id: decisionId.data },
      include: { notification: true, organizerProfile: true } });
    if (!decision || decision.organizerProfileId !== id.data) throw new ReviewError(404, "NOT_FOUND", "Decision not found");
    if (decision.notification?.status === "ACCEPTED") throw new ReviewError(409, "EMAIL_ALREADY_ACCEPTED", "Email was already accepted by the provider");
    const emailStatus = await dispatchDecisionEmail(decision.id, options);
    res.json({ data: { decisionId: decision.id, emailStatus } });
  } catch (error) { sendError(res, error); }
}
