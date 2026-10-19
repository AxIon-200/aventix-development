import type { Account, User } from "../generated/prisma/client.js";
import { errorResponse } from "./auth-response.js";
import { isExactPasswordHash, isLegacyPasswordHash } from "./exact-password.js";

export function accountAccessError(user: User, credential: Account | null) {
  if (user.status !== "ACTIVE") return errorResponse(403, "ACCOUNT_DISABLED", "Account access is disabled");
  if (!user.emailVerified) return errorResponse(403, "EMAIL_VERIFICATION_REQUIRED", "Email verification required");
  if (!user.termsVersion?.trim() || !user.termsAcceptedAt) {
    return errorResponse(403, "TERMS_ACCEPTANCE_REQUIRED", "Terms acceptance required");
  }
  if (credential?.password && isLegacyPasswordHash(credential.password)) {
    return errorResponse(403, "PASSWORD_RESET_REQUIRED", "Reset your password through password recovery before continuing");
  }
  if (!credential?.password || !isExactPasswordHash(credential.password)
    || !["ATTENDEE", "ORGANIZER", "ADMINISTRATOR"].includes(user.role)) {
    return errorResponse(401, "AUTHENTICATION_REQUIRED", "Authentication required");
  }
  return null;
}

export function publicProfile(user: User) {
  return {
    id: user.id, firstName: user.firstName, lastName: user.lastName, name: user.name,
    email: user.email, phoneNumber: user.phoneNumber, role: user.role, status: user.status,
    emailVerified: user.emailVerified, termsVersion: user.termsVersion, termsAcceptedAt: user.termsAcceptedAt,
    createdAt: user.createdAt, updatedAt: user.updatedAt,
  };
}
