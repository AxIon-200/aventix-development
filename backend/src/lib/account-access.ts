import type { Account, OrganizerStatus, User, UserRole } from "../generated/prisma/client.js";
import { errorResponse } from "./auth-response.js";
import { isExactPasswordHash, isLegacyPasswordHash } from "./exact-password.js";
import { roleAccessError } from "./role-permissions.js";

export function accountAccessError(user: User, credential: Account | null,
  { roles, requireTerms = true }: { roles: readonly UserRole[]; requireTerms?: boolean }) {
  if (user.status !== "ACTIVE") return errorResponse(403, "ACCOUNT_DISABLED", "Account access is disabled");
  if (!user.emailVerified) return errorResponse(403, "EMAIL_VERIFICATION_REQUIRED", "Email verification required");
  if (requireTerms && (!user.termsVersion?.trim() || !user.termsAcceptedAt)) {
    return errorResponse(403, "TERMS_ACCEPTANCE_REQUIRED", "Terms acceptance required");
  }
  if (credential?.password && isLegacyPasswordHash(credential.password)) {
    return errorResponse(403, "PASSWORD_RESET_REQUIRED", "Reset your password through password recovery before continuing");
  }
  if (!credential?.password || !isExactPasswordHash(credential.password)
    || !["ATTENDEE", "ORGANIZER", "ADMINISTRATOR"].includes(user.role)) {
    return errorResponse(401, "AUTHENTICATION_REQUIRED", "Authentication required");
  }
  return roleAccessError(user.role, roles);
}

export function organizationAccessError(status: OrganizerStatus | null | undefined) {
  if (status === "APPROVED") return null;
  if (status === "PENDING") return errorResponse(403, "ORGANIZATION_PENDING", "Organization application is pending administrator approval");
  if (status === "REJECTED") return errorResponse(403, "ORGANIZATION_REJECTED", "Organization application was rejected");
  if (status === "SUSPENDED") return errorResponse(403, "ORGANIZATION_SUSPENDED", "Organization access is suspended");
  return errorResponse(403, "ORGANIZATION_UNAVAILABLE", "Organization access is unavailable");
}

export function publicProfile(user: User) {
  return {
    id: user.id, firstName: user.firstName, lastName: user.lastName, name: user.name,
    email: user.email, phoneNumber: user.phoneNumber, role: user.role, status: user.status,
    emailVerified: user.emailVerified, termsVersion: user.termsVersion, termsAcceptedAt: user.termsAcceptedAt,
    createdAt: user.createdAt, updatedAt: user.updatedAt,
  };
}
