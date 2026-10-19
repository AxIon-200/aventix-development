import { createAuthEndpoint } from "better-auth/api";
import { z } from "zod";
import type { Account, User } from "../generated/prisma/client.js";
import type { RegistrationOptions } from "./registration.js";
import { accountAccessError } from "./account-access.js";
import { withAccountLock } from "./account-lifecycle.js";
import { errorResponse } from "./auth-response.js";

const input = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  currentPassword: z.string().refine(value => value.isWellFormed() && [...value].length >= 1 && [...value].length <= 128),
  termsAccepted: z.literal(true), termsVersion: z.string(),
}).strict();
const invalidCredentials = () => errorResponse(401, "INVALID_CREDENTIALS", "Invalid email or password");

export function termsAcceptanceEndpoints(options: RegistrationOptions) {
  return {
    acceptTerms: createAuthEndpoint("/accept-terms", { method: "POST", body: z.unknown() }, async ctx => {
      const parsed = input.safeParse(ctx.body);
      if (!parsed.success) return errorResponse(400, "VALIDATION_ERROR", "Invalid terms acceptance input");
      if (!options.terms) return errorResponse(503, "INTERNAL_ERROR", "Current terms are unavailable");
      const terms = options.terms;
      const { email, currentPassword, termsVersion } = parsed.data;
      if (termsVersion !== terms.version) {
        return errorResponse(409, "TERMS_VERSION_OUTDATED", "Current terms version is required");
      }
      try {
        const candidate = await ctx.context.adapter.findOne<User>({ model: "user", where: [{ field: "email", value: email }] });
        if (!candidate) {
          await ctx.context.password.hash(currentPassword);
          return invalidCredentials();
        }
        return await withAccountLock(ctx.context.adapter, candidate.id, async tx => {
          const user = await tx.findOne<User>({ model: "user", where: [{ field: "id", value: candidate.id }] });
          const credential = await tx.findOne<Account>({ model: "account", where: [
            { field: "userId", value: candidate.id }, { field: "providerId", value: "credential" },
          ] });
          if (!user || user.email !== email || !credential?.password
            || !await ctx.context.password.verify({ hash: credential.password, password: currentPassword })) return invalidCredentials();
          // This operation completes consent; every other access gate still applies.
          const denied = accountAccessError(user, credential, { requireTerms: false });
          if (denied) return denied;
          if (!user.termsVersion?.trim() || !user.termsAcceptedAt) {
            const updated = await tx.update({ model: "user", where: [{ field: "id", value: user.id }],
              update: { termsVersion: terms.version, termsAcceptedAt: options.now() } });
            if (!updated) throw new Error("Terms acceptance persistence failed");
          }
          return ctx.json({ data: { termsAccepted: true } });
        });
      } catch {
        return errorResponse(500, "INTERNAL_ERROR", "Request could not be completed");
      }
    }),
  };
}
