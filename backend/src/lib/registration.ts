import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createAuthEndpoint } from "better-auth/api";
import { getCurrentAdapter, runWithTransaction } from "@better-auth/core/context";
import type { BetterAuthPlugin } from "better-auth";
import { z } from "zod";
import type { SendVerificationEmail } from "./verification-email.js";
import { env } from "../config/env.js";
import { Prisma } from "../generated/prisma/client.js";
import type { CurrentTerms } from "../config/terms.js";

export interface RegistrationOptions {
  terms?: CurrentTerms;
  sendVerificationEmail: SendVerificationEmail;
  now: () => Date;
}

const name = z.string().trim().refine(value => value.isWellFormed() && !value.includes("\u0000") && [...value].length >= 1 && [...value].length <= 100);
const input = z.object({
  firstName: name, lastName: name,
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().refine(value => value.isWellFormed() && [...value].length >= 15 && [...value].length <= 128),
  phoneNumber: z.string().regex(/^(?:09[0-9]{9}|\+639[0-9]{9})$/)
    .transform(value => value.startsWith("09") ? `+63${value.slice(1)}` : value).optional(),
  termsAccepted: z.literal(true), termsVersion: z.string(),
}).strict();

export const errorResponse = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

class DuplicateEmail extends Error {}

export function registrationPlugin(options: RegistrationOptions) {
  return {
    id: "aventix-registration",
    async onRequest(request) {
      const path = new URL(request.url).pathname;
      // Defense in depth when the Better Auth handler is used without Express.
      if (path !== "/api/auth/register") return { response: errorResponse(404, "NOT_FOUND", "Route not found") };
      if (request.method !== "POST") return { response: Response.json({ error: {
        code: "METHOD_NOT_ALLOWED", message: "Method is not allowed",
      } }, { status: 405, headers: { Allow: "POST" } }) };
      if (request.headers.get("origin") !== env.FRONTEND_URL) {
        return { response: errorResponse(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed") };
      }
      if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
        return { response: errorResponse(415, "UNSUPPORTED_MEDIA_TYPE", "JSON content type is required") };
      }
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      if (reader) {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > 16 * 1024) {
            void reader.cancel();
            return { response: errorResponse(413, "PAYLOAD_TOO_LARGE", "Request body is too large") };
          }
          chunks.push(value);
        }
      }
      const body = Buffer.concat(chunks).toString("utf8");
      try { JSON.parse(body); }
      catch { return { response: errorResponse(400, "VALIDATION_ERROR", "Invalid JSON body") }; }
      return { request: new Request(request, { body }) };
    },
    schema: {
      authLink: { fields: {
        userId: { type: "string", required: true, references: { model: "user", field: "id" } },
        purpose: { type: "string", required: true }, digest: { type: "string", required: true, unique: true },
        createdAt: { type: "date", required: true }, expiresAt: { type: "date", required: true },
        consumedAt: { type: "date", required: false },
      } },
      emailCooldown: { fields: {
        email: { type: "string", required: true }, purpose: { type: "string", required: true },
        attemptedAt: { type: "date", required: true },
      } },
    },
    endpoints: {
      registerAttendee: createAuthEndpoint("/register", { method: "POST", body: z.unknown() }, async ctx => {
        const parsed = input.safeParse(ctx.body);
        if (!parsed.success) return errorResponse(400, "VALIDATION_ERROR", "Invalid registration input");
        if (!options.terms) return errorResponse(503, "INTERNAL_ERROR", "Current terms are unavailable");
        const body = parsed.data;
        if (body.termsVersion !== options.terms.version) {
          return errorResponse(409, "TERMS_VERSION_OUTDATED", "Current terms version is required");
        }
        const token = randomBytes(32).toString("base64url");
        try {
          // Hash before opening the database transaction. The database uniqueness
          // constraint resolves concurrent registrations; a precheck alone cannot.
          const existing = await ctx.context.internalAdapter.findUserByEmail(body.email);
          if (existing) throw new DuplicateEmail();
          const password = await ctx.context.password.hash(body.password);
          await runWithTransaction(ctx.context.adapter, async () => {
            const adapter = await getCurrentAdapter(ctx.context.adapter);
            const now = options.now();
            const user = await ctx.context.internalAdapter.createUser({
              email: body.email, name: `${body.firstName} ${body.lastName}`,
              firstName: body.firstName, lastName: body.lastName,
              phoneNumber: body.phoneNumber ?? null,
              role: "ATTENDEE", status: "ACTIVE", emailVerified: false,
              termsVersion: options.terms!.version, termsAcceptedAt: now,
            }, { method: "email-password" });
            await ctx.context.internalAdapter.linkAccount({
              userId: user.id, providerId: "credential", accountId: user.id, password,
            });
            // A new user row is already exclusively locked by this transaction.
            await adapter.create({ model: "authLink", forceAllowId: true, data: {
              id: randomUUID(), userId: user.id, purpose: "EMAIL_VERIFICATION",
              digest: createHash("sha256").update(token).digest("hex"),
              createdAt: now, expiresAt: new Date(now.getTime() + 86_400_000),
            } });
            await adapter.create({ model: "emailCooldown", forceAllowId: true, data: {
              id: randomUUID(), email: body.email, purpose: "EMAIL_VERIFICATION", attemptedAt: now,
            } });
          });
        } catch (error) {
          if (error instanceof DuplicateEmail || (error instanceof Prisma.PrismaClientKnownRequestError
            && error.code === "P2002" && error.meta?.modelName === "User")) {
            return errorResponse(409, "EMAIL_ALREADY_REGISTERED", "Email is already registered");
          }
          // Do not pass credentials or adapter errors to logging or the client.
          console.error("Registration persistence failed", { correlationId: randomUUID() });
          return errorResponse(500, "INTERNAL_ERROR", "Request could not be completed");
        }
        const url = new URL("/api/auth/verification", ctx.context.options.baseURL as string);
        url.hash = new URLSearchParams({ token }).toString();
        try {
          await options.sendVerificationEmail({ to: body.email, url: url.href });
        } catch {
          console.error("Verification email delivery failed", { correlationId: randomUUID() });
          return errorResponse(503, "ACCOUNT_CREATED_EMAIL_FAILED",
            "Account was created, but verification email could not be sent. Request another verification email.");
        }
        return Response.json({ data: { verificationRequired: true } }, { status: 201 });
      }),
    },
  } satisfies BetterAuthPlugin;
}
