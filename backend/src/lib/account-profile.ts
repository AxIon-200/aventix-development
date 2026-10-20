import { SELF_SERVICE_ROLES } from "./role-permissions.js";
import { createAuthEndpoint } from "better-auth/api";
import { z } from "zod";
import type { Account, Session, User } from "../generated/prisma/client.js";
import type { RegistrationOptions } from "./registration.js";
import { accountAccessError, publicProfile } from "./account-access.js";
import { withAccountLock } from "./account-lifecycle.js";
import { errorResponse } from "./auth-response.js";
import { profileName, profilePhone } from "./profile-input.js";

const input = z.object({
  firstName: profileName.optional(), lastName: profileName.optional(), phoneNumber: profilePhone.nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0);
const authenticationRequired = () => errorResponse(401, "AUTHENTICATION_REQUIRED", "Authentication required");

export function profileEndpoints(options: RegistrationOptions) {
  return {
    // Internal API only; both HTTP auth allowlists reject this path.
    updateOwnProfile: createAuthEndpoint("/update-own-profile", {
      method: "POST", requireHeaders: true, body: z.unknown(),
    }, async ctx => {
      const parsed = input.safeParse(ctx.body);
      if (!parsed.success) return errorResponse(400, "VALIDATION_ERROR", "Invalid profile input");
      try {
        const token = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
        if (!token) return authenticationRequired();
        const current = await ctx.context.internalAdapter.findSession(token);
        if (!current) return authenticationRequired();
        return await withAccountLock(ctx.context.adapter, current.user.id, async tx => {
          // Recheck session and account policy after waiting for lifecycle mutations.
          const session = await tx.findOne<Session>({ model: "session", where: [{ field: "token", value: token }] });
          if (!session || session.userId !== current.user.id || session.expiresAt.getTime() <= options.now().getTime()) {
            return authenticationRequired();
          }
          const user = await tx.findOne<User>({ model: "user", where: [{ field: "id", value: session.userId }] });
          if (!user) return authenticationRequired();
          const credential = await tx.findOne<Account>({ model: "account", where: [
            { field: "userId", value: user.id }, { field: "providerId", value: "credential" },
          ] });
          const denied = accountAccessError(user, credential, { roles: SELF_SERVICE_ROLES });
          if (denied) return denied;
          const changes = parsed.data;
          const nameChanged = changes.firstName !== undefined || changes.lastName !== undefined;
          const updated = await tx.update<User>({ model: "user", where: [{ field: "id", value: user.id }],
            update: { ...changes, ...(nameChanged ? {
              name: `${changes.firstName ?? user.firstName} ${changes.lastName ?? user.lastName}`,
            } : {}), updatedAt: options.now() } });
          if (!updated) throw new Error("Profile update failed");
          return ctx.json({ data: { user: publicProfile(updated) } });
        });
      } catch {
        return errorResponse(500, "INTERNAL_ERROR", "Request could not be completed");
      }
    }),
  };
}
