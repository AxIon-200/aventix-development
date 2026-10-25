import { Router } from "express";
import type { createAuth } from "../lib/auth.js";
import { requireRoles } from "../lib/authorization.js";
import { prisma } from "../lib/prisma.js";

/** Account edits and password changes use the shared /me and auth contracts. */
export function adminProfileRouter(auth: ReturnType<typeof createAuth>) {
  const router = Router();
  router.use(requireRoles(auth, ["ADMINISTRATOR"]));
  router.get("/", async (req, res) => {
    if (Object.keys(req.query).length) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Profile queries are not supported" } });
    }
    const user = res.locals.user;
    try {
      const passwordChange = await prisma.activityLog.findFirst({
        where: { userId: user.id, entityId: user.id, entityType: "User", action: { in: ["PASSWORD_CHANGED", "PASSWORD_RESET"] } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { createdAt: true },
      });
      return res.json({ data: {
        id: user.id, fullName: user.name, email: user.email, phone: user.phoneNumber,
        role: "admin", roleLabel: "Administrator", status: "active", avatarUrl: null,
        // Historical login times and two-factor status are not currently tracked.
        lastLoginAt: null, createdAt: user.createdAt,
        passwordChangedAt: passwordChange?.createdAt.toISOString() ?? null,
        twoFactorEnabled: null,
      } });
    } catch {
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Could not load your profile" } });
    }
  });
  return router;
}
