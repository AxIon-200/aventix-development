import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "./prisma.js";
import { env } from "../config/env.js";
import { registrationPlugin } from "./registration.js";
import type { RegistrationOptions } from "./registration.js";
import { hashExactPassword, verifyExactPassword } from "./exact-password.js";

export function createAuth(options: RegistrationOptions) {
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
      transaction: true,
    }),

    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,

    trustedOrigins: [env.FRONTEND_URL],

    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      autoSignIn: false,
      requireEmailVerification: true,
      password: { hash: hashExactPassword, verify: verifyExactPassword },
    },
    plugins: [registrationPlugin(options)],
    logger: { disabled: true },
    rateLimit: { enabled: false }, // Durable Express limits use the verified direct peer IP.
    session: { expiresIn: 604800, disableSessionRefresh: true, cookieCache: { enabled: false } },

    advanced: {
      database: {
        generateId: "uuid",
      },
    },

    user: {
      additionalFields: {
        firstName: {
          type: "string",
          required: true,
        },

        lastName: {
          type: "string",
          required: true,
        },

        phoneNumber: {
          type: "string",
          required: false,
        },

        role: {
          type: "string",
          required: true,
          defaultValue: "ATTENDEE",
          input: false,
        },

        status: {
          type: "string",
          required: true,
          defaultValue: "ACTIVE",
          input: false,
        },

        termsAcceptedAt: {
          type: "date",
          required: false,
          input: false,
        },

        termsVersion: {
          type: "string",
          required: false,
          input: false,
        },
        lifecycleLock: { type: "string", required: false, input: false, returned: false },
      },
    },
  });
}
