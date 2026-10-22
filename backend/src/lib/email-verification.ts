import { createHash, randomUUID } from "node:crypto";
import { createAuthEndpoint } from "better-auth/api";
import { z } from "zod";
import type { RegistrationOptions } from "./registration.js";
import type { AuthLink, Account, User, EmailCooldown } from "../generated/prisma/client.js";
import { errorResponse } from "./auth-response.js";
import { withAccountLock } from "./account-lifecycle.js";
import { isLegacyPasswordHash } from "./exact-password.js";
import { issueVerificationLink, verificationUrl } from "./verification-link.js";

const verificationInput = z.object({
  token: z.string().min(1).max(512),
  currentPassword: z.string().refine(value => value.isWellFormed() && [...value].length >= 1 && [...value].length <= 128),
}).strict();
const invalidLink = () => errorResponse(400, "LINK_INVALID_OR_EXPIRED", "Link is invalid or expired");
const resendInput = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) }).strict();
const resendResult = () => Response.json({ data: { message: "If this address is eligible, a verification email will be sent." } });

export function verificationEndpoints(options: RegistrationOptions) {
  return {
    resendVerification: createAuthEndpoint("/resend-verification", { method: "POST", body: z.unknown() }, async ctx => {
      const parsed = resendInput.safeParse(ctx.body);
      if (!parsed.success) return errorResponse(400, "VALIDATION_ERROR", "Invalid verification resend input");
      const { email } = parsed.data;
      let token: string | null;
      try {
        const candidate = await ctx.context.adapter.findOne<User>({ model: "user", where: [{ field: "email", value: email }] });
        if (!candidate) return resendResult();
        token = await withAccountLock(ctx.context.adapter, candidate.id, async tx => {
          const user = await tx.findOne<User>({ model: "user", where: [{ field: "id", value: candidate.id }] });
          if (!user || user.email !== email || user.emailVerified) return null;
          const now = options.now();
          const cooldown = await tx.findOne<EmailCooldown>({ model: "emailCooldown", where: [
            { field: "email", value: email }, { field: "purpose", value: "EMAIL_VERIFICATION" },
          ] });
          if (cooldown && now.getTime() - cooldown.attemptedAt.getTime() < 60_000) return null;
          // The account lock serializes claims even when no cooldown row exists.
          if (cooldown) {
            await tx.update({ model: "emailCooldown", where: [{ field: "id", value: cooldown.id }], update: { attemptedAt: now } });
          } else {
            await tx.create({ model: "emailCooldown", forceAllowId: true, data: {
              id: randomUUID(), email, purpose: "EMAIL_VERIFICATION", attemptedAt: now,
            } });
          }
          return issueVerificationLink(tx, user.id, now);
        });
      } catch {
        return errorResponse(500, "INTERNAL_ERROR", "Request could not be completed");
      }
      if (token) {
        try { await options.sendVerificationEmail({ to: email, url: verificationUrl(token) }); }
        catch { console.error("Verification email delivery failed", { correlationId: randomUUID() }); }
      }
      return resendResult();
    }),
    // Replace the native registry key so link-only GET verification is absent.
    verifyEmail: createAuthEndpoint("/verify-email", { method: "POST", body: z.unknown() }, async ctx => {
      const parsed = verificationInput.safeParse(ctx.body);
      if (!parsed.success) return errorResponse(400, "VALIDATION_ERROR", "Invalid verification input");
      const { token, currentPassword } = parsed.data;
      const digest = createHash("sha256").update(token).digest("hex");
      try {
        const candidate = await ctx.context.adapter.findOne<AuthLink>({ model: "authLink", where: [{ field: "digest", value: digest }] });
        if (!candidate) return invalidLink();
        return await withAccountLock(ctx.context.adapter, candidate.userId, async tx => {
          const user = await tx.findOne<User>({ model: "user", where: [{ field: "id", value: candidate.userId }] });
          const link = await tx.findOne<AuthLink>({ model: "authLink", where: [{ field: "digest", value: digest }] });
          const now = options.now();
          if (!user || user.emailVerified || !link || link.userId !== user.id || link.purpose !== "EMAIL_VERIFICATION"
            || link.consumedAt || link.expiresAt.getTime() <= now.getTime()) return invalidLink();
          const credential = await tx.findOne<Account>({ model: "account", where: [
            { field: "userId", value: user.id }, { field: "providerId", value: "credential" },
          ] });
          if (!credential?.password || !await ctx.context.password.verify({ hash: credential.password, password: currentPassword })) {
            return errorResponse(401, "CURRENT_PASSWORD_INCORRECT", "Current password is incorrect");
          }
          if (isLegacyPasswordHash(credential.password)) {
            return errorResponse(403, "PASSWORD_RESET_REQUIRED", "Reset your password through password recovery before continuing");
          }
          await tx.update({ model: "user", where: [{ field: "id", value: user.id }], update: { emailVerified: true } });
          const consumed = await tx.updateMany({ model: "authLink", where: [
            { field: "userId", value: user.id }, { field: "purpose", value: "EMAIL_VERIFICATION" },
            { field: "consumedAt", value: null },
          ], update: { consumedAt: now } });
          if (consumed < 1) throw new Error("Verification link consumption failed");
          return Response.json({ data: { emailVerified: true } });
        });
      } catch {
        return errorResponse(500, "INTERNAL_ERROR", "Request could not be completed");
      }
    }),
  };
}
