import { SELF_SERVICE_ROLES } from "./role-permissions.js";
import { randomUUID } from "node:crypto";
import { createAuthEndpoint } from "better-auth/api";
import { z } from "zod";
import type { Account, Session, User } from "../generated/prisma/client.js";
import type { RegistrationOptions } from "./registration.js";
import { accountAccessError } from "./account-access.js";
import { withAccountLock } from "./account-lifecycle.js";
import { errorResponse } from "./auth-response.js";

const input = z.object({
  currentPassword: z.string().refine(value => value.isWellFormed() && [...value].length >= 1 && [...value].length <= 128),
  newPassword: z.string().refine(value => value.isWellFormed() && [...value].length >= 15 && [...value].length <= 128),
}).strict();
const authenticationRequired = () => errorResponse(401, "AUTHENTICATION_REQUIRED", "Authentication required");

export function passwordChangeEndpoints(options: RegistrationOptions) {
  return {
    // Replace the native registry key: revocation is mandatory and the current
    // session must retain its token and original expiry.
    changePassword: createAuthEndpoint("/change-password", {
      method: "POST", requireHeaders: true, body: z.unknown(),
    }, async ctx => {
      const parsed = input.safeParse(ctx.body);
      if (!parsed.success) return errorResponse(400, "VALIDATION_ERROR", "Invalid password change input");
      try {
        const token = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
        if (!token) return authenticationRequired();
        const current = await ctx.context.internalAdapter.findSession(token);
        if (!current) return authenticationRequired();
        return await withAccountLock(ctx.context.adapter, current.user.id, async tx => {
          // A reset or another change may have revoked this session while waiting.
          const session = await tx.findOne<Session>({ model: "session", where: [{ field: "token", value: token }] });
          const now = options.now();
          if (!session || session.userId !== current.user.id || session.expiresAt.getTime() <= now.getTime()) {
            return authenticationRequired();
          }
          const user = await tx.findOne<User>({ model: "user", where: [{ field: "id", value: session.userId }] });
          if (!user) return authenticationRequired();
          const credential = await tx.findOne<Account>({ model: "account", where: [
            { field: "userId", value: user.id }, { field: "providerId", value: "credential" },
          ] });
          const denied = accountAccessError(user, credential, { roles: SELF_SERVICE_ROLES });
          if (denied) return denied;
          const { currentPassword, newPassword } = parsed.data;
          if (!await ctx.context.password.verify({ hash: credential!.password!, password: currentPassword })) {
            return errorResponse(401, "CURRENT_PASSWORD_INCORRECT", "Current password is incorrect");
          }
          if (newPassword === currentPassword) {
            return errorResponse(400, "PASSWORD_REUSE", "New password must differ from current password");
          }
          const password = await ctx.context.password.hash(newPassword);
          const changed = await tx.updateMany({ model: "account", where: [{ field: "id", value: credential!.id }], update: { password } });
          if (changed !== 1) throw new Error("Credential replacement failed");
          await tx.updateMany({ model: "authLink", where: [
            { field: "userId", value: user.id }, { field: "purpose", value: "PASSWORD_RESET" },
            { field: "consumedAt", value: null },
          ], update: { consumedAt: now } });
          await tx.deleteMany({ model: "session", where: [
            { field: "userId", value: user.id }, { field: "id", operator: "ne", value: session.id },
          ] });
          await tx.create({ model: "activityLog", forceAllowId: true, data: {
            id: randomUUID(), userId: user.id, action: "PASSWORD_CHANGED", entityType: "User", entityId: user.id, createdAt: now,
          } });
          return ctx.json({ data: { passwordChanged: true } });
        });
      } catch {
        return errorResponse(500, "INTERNAL_ERROR", "Request could not be completed");
      }
    }),
  };
}
