import type { RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { createAuth } from "./auth.js";
import type { UserRole } from "../generated/prisma/client.js";
import { roleAccessError } from "./role-permissions.js";

// Each operation supplies its own allowlist. An empty list denies every role.
export function requireRoles(auth: ReturnType<typeof createAuth>, permittedRoles: readonly UserRole[]): RequestHandler {
  return async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    try {
      // The internal endpoint authenticates the cookie and re-reads live gates.
      const response = await auth.api.readOwnProfile({ headers: fromNodeHeaders(req.headers), asResponse: true });
      const body = await response.json();
      if (!response.ok) {
        res.status(response.status).json(body);
        return;
      }
      const denied = roleAccessError(body.data.user.role, permittedRoles);
      if (denied) {
        res.status(denied.status).json(await denied.json());
        return;
      }
      res.locals.user = body.data.user;
      next();
    } catch {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } });
    }
  };
}
