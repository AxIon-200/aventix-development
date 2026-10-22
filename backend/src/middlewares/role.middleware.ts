import type { Request, Response, NextFunction } from "express";

export type Role = "GUEST" | "ATTENDEE" | "ORGANIZER" | "ADMINISTRATOR";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Middleware ensuring the requester has one of the allowed roles.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // If GUEST is allowed, unauthenticated requests can pass
    if (allowedRoles.includes("GUEST") && !req.user) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Authentication token required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: `Access denied. Requires one of the following roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
}
