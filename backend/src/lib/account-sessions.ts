import { createAuthEndpoint } from "better-auth/api";
import { deleteSessionCookie, setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import type { Account, User } from "../generated/prisma/client.js";
import type { RegistrationOptions } from "./registration.js";
import { accountAccessError, publicProfile } from "./account-access.js";
import { withAccountLock } from "./account-lifecycle.js";
import { errorResponse } from "./auth-response.js";

const loginInput = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().refine(value => value.isWellFormed() && [...value].length >= 1 && [...value].length <= 128),
}).strict();
const invalidCredentials = () => errorResponse(401, "INVALID_CREDENTIALS", "Invalid email or password");
const authenticationRequired = () => errorResponse(401, "AUTHENTICATION_REQUIRED", "Authentication required");

export function sessionEndpoints(options: RegistrationOptions) {
  return {
    logout: createAuthEndpoint("/logout", { method: "POST", body: z.unknown() }, async ctx => {
      if (!z.object({}).strict().safeParse(ctx.body).success) return errorResponse(400, "VALIDATION_ERROR", "Invalid logout input");
      try {
        const token = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
        if (token) await ctx.context.internalAdapter.deleteSession(token);
        deleteSessionCookie(ctx);
        return ctx.json({ data: { loggedOut: true } });
      } catch {
        return errorResponse(500, "INTERNAL_ERROR", "Request could not be completed");
      }
    }),
    login: createAuthEndpoint("/login", { method: "POST", body: z.unknown() }, async ctx => {
      const parsed = loginInput.safeParse(ctx.body);
      if (!parsed.success) return errorResponse(400, "VALIDATION_ERROR", "Invalid login input");
      const { email, password } = parsed.data;
      try {
        const candidate = await ctx.context.adapter.findOne<User>({ model: "user", where: [{ field: "email", value: email }] });
        if (!candidate) {
          // Match the expensive credential work without disclosing account state.
          await ctx.context.password.hash(password);
          return invalidCredentials();
        }
        const result = await withAccountLock(ctx.context.adapter, candidate.id, async tx => {
          const user = await tx.findOne<User>({ model: "user", where: [{ field: "id", value: candidate.id }] });
          const credential = await tx.findOne<Account>({ model: "account", where: [
            { field: "userId", value: candidate.id }, { field: "providerId", value: "credential" },
          ] });
          if (!user || user.email !== email || !credential?.password
            || !await ctx.context.password.verify({ hash: credential.password, password })) return invalidCredentials();
          const denied = accountAccessError(user, credential);
          if (denied) return denied;
          const now = options.now();
          // This version-sensitive Better Auth bridge joins the current transaction.
          const session = await ctx.context.internalAdapter.createSession(user.id, false, {
            createdAt: now, updatedAt: now, expiresAt: new Date(now.getTime() + 604800_000),
          }, true);
          if (!session) throw new Error("Session creation failed");
          return { user, session };
        });
        if (result instanceof Response) return result;
        // A failed transaction must never send a usable cookie. Explicit false
        // ignores any old native dont_remember cookie.
        await setSessionCookie(ctx, result, false, {
          expires: result.session.expiresAt,
          maxAge: Math.max(0, Math.floor((result.session.expiresAt.getTime() - options.now().getTime()) / 1000)),
        });
        return ctx.json({ data: { user: publicProfile(result.user) } });
      } catch {
        return errorResponse(500, "INTERNAL_ERROR", "Request could not be completed");
      }
    }),
    // Internal API only: the HTTP allowlist rejects /api/auth/own-profile.
    readOwnProfile: createAuthEndpoint("/own-profile", { method: "GET", requireHeaders: true }, async ctx => {
      try {
        const token = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
        if (!token) return authenticationRequired();
        const current = await ctx.context.internalAdapter.findSession(token);
        if (!current || current.session.expiresAt.getTime() <= options.now().getTime()) return authenticationRequired();
        const user = await ctx.context.adapter.findOne<User>({ model: "user", where: [{ field: "id", value: current.user.id }] });
        if (!user) return authenticationRequired();
        const credential = await ctx.context.adapter.findOne<Account>({ model: "account", where: [
          { field: "userId", value: user.id }, { field: "providerId", value: "credential" },
        ] });
        const denied = accountAccessError(user, credential);
        return denied ?? ctx.json({ data: { user: publicProfile(user) } });
      } catch {
        return errorResponse(500, "INTERNAL_ERROR", "Request could not be completed");
      }
    }),
  };
}
