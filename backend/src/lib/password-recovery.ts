import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createAuthEndpoint } from "better-auth/api";
import { deleteSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import type { Account, AuthLink, EmailCooldown, User } from "../generated/prisma/client.js";
import type { RegistrationOptions } from "./registration.js";
import { withAccountLock } from "./account-lifecycle.js";
import { errorResponse } from "./auth-response.js";
import { sendPasswordResetEmail } from "./password-reset-email.js";

const requestInput = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) }).strict();
const resetInput = z.object({
  token: z.string().min(1).max(512),
  newPassword: z.string().refine(value => value.isWellFormed() && [...value].length >= 15 && [...value].length <= 128),
}).strict();
const requested = () => Response.json({ data: {
  message: "If an account exists for this address, a password-reset email will be sent.",
} });
const invalidLink = () => errorResponse(400, "LINK_INVALID_OR_EXPIRED", "Link is invalid or expired");

export function recoveryEndpoints(options: RegistrationOptions) {
  return {
    // Replace the native registry keys as well as their public paths.
    requestPasswordReset: createAuthEndpoint("/request-password-reset", { method: "POST", body: z.unknown() }, async ctx => {
      const parsed = requestInput.safeParse(ctx.body);
      if (!parsed.success) return errorResponse(400, "VALIDATION_ERROR", "Invalid password recovery input");
      const { email } = parsed.data;
      let token: string | null;
      try {
        const candidate = await ctx.context.adapter.findOne<User>({ model: "user", where: [{ field: "email", value: email }] });
        if (!candidate) return requested();
        token = await withAccountLock(ctx.context.adapter, candidate.id, async tx => {
          const user = await tx.findOne<User>({ model: "user", where: [{ field: "id", value: candidate.id }] });
          if (!user || user.email !== email) return null;
          const now = options.now();
          const cooldown = await tx.findOne<EmailCooldown>({ model: "emailCooldown", where: [
            { field: "email", value: email }, { field: "purpose", value: "PASSWORD_RESET" },
          ] });
          if (cooldown && now.getTime() - cooldown.attemptedAt.getTime() < 60_000) return null;
          if (cooldown) {
            await tx.update({ model: "emailCooldown", where: [{ field: "id", value: cooldown.id }], update: { attemptedAt: now } });
          } else {
            await tx.create({ model: "emailCooldown", forceAllowId: true, data: {
              id: randomUUID(), email, purpose: "PASSWORD_RESET", attemptedAt: now,
            } });
          }
          const token = randomBytes(32).toString("base64url");
          await tx.create({ model: "authLink", forceAllowId: true, data: {
            id: randomUUID(), userId: user.id, purpose: "PASSWORD_RESET",
            digest: createHash("sha256").update(token).digest("hex"),
            createdAt: now, expiresAt: new Date(now.getTime() + 1_800_000),
          } });
          return token;
        });
      } catch {
        return errorResponse(500, "INTERNAL_ERROR", "Request could not be completed");
      }
      if (token) {
        const url = new URL("/api/auth/password-reset", ctx.context.options.baseURL as string);
        url.hash = new URLSearchParams({ token }).toString();
        try { await (options.sendPasswordResetEmail ?? sendPasswordResetEmail)({ to: email, url: url.href }); }
        catch { console.error("Password reset email delivery failed", { correlationId: randomUUID() }); }
      }
      return requested();
    }),
    resetPassword: createAuthEndpoint("/reset-password", { method: "POST", body: z.unknown() }, async ctx => {
      const parsed = resetInput.safeParse(ctx.body);
      if (!parsed.success) return errorResponse(400, "VALIDATION_ERROR", "Invalid password reset input");
      const { token, newPassword } = parsed.data;
      const digest = createHash("sha256").update(token).digest("hex");
      try {
        const candidate = await ctx.context.adapter.findOne<AuthLink>({ model: "authLink", where: [{ field: "digest", value: digest }] });
        if (!candidate) return invalidLink();
        const result = await withAccountLock(ctx.context.adapter, candidate.userId, async tx => {
          const user = await tx.findOne<User>({ model: "user", where: [{ field: "id", value: candidate.userId }] });
          const link = await tx.findOne<AuthLink>({ model: "authLink", where: [{ field: "digest", value: digest }] });
          const now = options.now();
          if (!user || !link || link.userId !== user.id || link.purpose !== "PASSWORD_RESET"
            || link.consumedAt || link.expiresAt.getTime() <= now.getTime()) return invalidLink();
          const credential = await tx.findOne<Account>({ model: "account", where: [
            { field: "userId", value: user.id }, { field: "providerId", value: "credential" },
          ] });
          if (!credential?.password) return invalidLink();
          if (await ctx.context.password.verify({ hash: credential.password, password: newPassword })) {
            return errorResponse(400, "PASSWORD_REUSE", "New password must differ from current password");
          }
          const password = await ctx.context.password.hash(newPassword);
          const changed = await tx.updateMany({ model: "account", where: [{ field: "id", value: credential.id }], update: { password } });
          if (changed !== 1) throw new Error("Credential replacement failed");
          const consumed = await tx.updateMany({ model: "authLink", where: [
            { field: "userId", value: user.id }, { field: "purpose", value: "PASSWORD_RESET" },
            { field: "consumedAt", value: null },
          ], update: { consumedAt: now } });
          if (consumed < 1) throw new Error("Reset link consumption failed");
          await tx.deleteMany({ model: "session", where: [{ field: "userId", value: user.id }] });
          await tx.create({ model: "activityLog", forceAllowId: true, data: {
            id: randomUUID(), userId: user.id, action: "PASSWORD_RESET", entityType: "User", entityId: user.id, createdAt: now,
          } });
          return null;
        });
        if (result) return result;
        deleteSessionCookie(ctx);
        return ctx.json({ data: { passwordReset: true } });
      } catch {
        return errorResponse(500, "INTERNAL_ERROR", "Request could not be completed");
      }
    }),
  };
}
