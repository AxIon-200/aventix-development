import type { UserRole } from "../generated/prisma/client.js";
import { errorResponse } from "./auth-response.js";

export const SELF_SERVICE_ROLES = ["ATTENDEE", "ORGANIZER", "ADMINISTRATOR"] as const;

export function roleAccessError(role: string, permittedRoles: readonly UserRole[]) {
  return permittedRoles.some(permitted => permitted === role) ? null
    : errorResponse(403, "FORBIDDEN", "Insufficient permission");
}
