import { Router } from "express";
import { z } from "zod";
import type { createAuth } from "../lib/auth.js";
import { requireRoles } from "../lib/authorization.js";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

// Unsupported security/platform controls cannot be enabled through this API.
export const settingsInput = z.object({
  general: z.object({
    timezone: z.enum(["Asia/Manila", "Asia/Singapore", "Asia/Hong_Kong", "Asia/Tokyo", "Australia/Sydney", "UTC", "Europe/London", "America/New_York", "America/Los_Angeles"]),
    language: z.literal("en"),
  }).strict(),
  notifications: z.object({ email: z.boolean(), bookingReminders: z.boolean(), paymentAlerts: z.boolean(),
    eventUpdates: z.boolean(), dailySummary: z.enum(["daily", "weekdays", "weekly", "never"]) }).strict(),
  security: z.object({ twoFactor: z.literal(false), loginAlerts: z.literal(false),
    autoLogout: z.literal(false), sessionTimeout: z.literal(30) }).strict(),
  appearance: z.object({ theme: z.literal("dark"), density: z.enum(["comfortable", "compact"]),
    compactTables: z.boolean(), sidebar: z.enum(["expanded", "collapsed"]), reduceMotion: z.boolean() }).strict(),
  system: z.object({ dataRefresh: z.enum(["off", "1m", "5m", "15m"]), maintenanceMode: z.literal(false) }).strict(),
}).strict();

export const defaultSettings: z.infer<typeof settingsInput> = {
  general: { timezone: "Asia/Manila", language: "en" },
  notifications: { email: true, bookingReminders: true, paymentAlerts: true, eventUpdates: false, dailySummary: "daily" },
  security: { twoFactor: false, loginAlerts: false, autoLogout: false, sessionTimeout: 30 },
  appearance: { theme: "dark", density: "comfortable", compactTables: false, sidebar: "expanded", reduceMotion: false },
  system: { dataRefresh: "5m", maintenanceMode: false },
};

export function adminSettingsRouter(auth: ReturnType<typeof createAuth>) {
  const router = Router();
  router.use(requireRoles(auth, ["ADMINISTRATOR"]));
  router.get("/", async (req, res) => {
    if (Object.keys(req.query).length) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Settings queries are not supported" } });
    try {
      const row = await prisma.adminPreferences.findUnique({ where: { userId: res.locals.user.id } });
      return res.json({ settings: row ? settingsInput.parse(row.settings) : defaultSettings,
        updatedAt: row?.updatedAt.toISOString() ?? null });
    } catch {
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Could not load settings" } });
    }
  });
  router.put("/", async (req, res) => {
    if (req.get("Origin") !== env.FRONTEND_URL) return res.status(403).json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Request origin is not allowed" } });
    if (!req.is("application/json")) return res.status(415).json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "JSON content type is required" } });
    const parsed = settingsInput.safeParse(req.body);
    if (!parsed.success || Object.keys(req.query).length) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid settings or an unavailable option was selected" } });
    try {
      const row = await prisma.$transaction(async tx => {
        const saved = await tx.adminPreferences.upsert({ where: { userId: res.locals.user.id },
          create: { userId: res.locals.user.id, settings: parsed.data }, update: { settings: parsed.data } });
        await tx.activityLog.create({ data: { userId: res.locals.user.id, entityId: res.locals.user.id,
          entityType: "AdminPreferences", action: "ADMIN_SETTINGS_UPDATED" } });
        return saved;
      });
      return res.json({ settings: parsed.data, updatedAt: row.updatedAt.toISOString() });
    } catch {
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Could not save settings" } });
    }
  });
  return router;
}
