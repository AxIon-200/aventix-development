import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
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
        },
    },
});
//# sourceMappingURL=auth.js.map