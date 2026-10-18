import { AdminSettings, SettingsResponse } from "@/app/admin/types/settings";

// ─────────────────────────────────────────────────────────────
// DEMO SWITCHES — only used while USE_MOCK is true in settingsService.ts
//   failRequests:    true = every request fails (preview the error states)
//   currentPassword: the password the "Change password" form must be given
// ─────────────────────────────────────────────────────────────
export const DEMO = {
  failRequests: false,
  currentPassword: "Admin@1234",
};

const DEFAULT_SETTINGS: AdminSettings = {
  general: { timezone: "Asia/Manila", language: "en" },
  notifications: {
    email: true,
    bookingReminders: true,
    paymentAlerts: true,
    eventUpdates: false,
    dailySummary: "daily",
  },
  security: { twoFactor: false, loginAlerts: true, autoLogout: true, sessionTimeout: 30 },
  appearance: {
    theme: "dark",
    density: "comfortable",
    compactTables: false,
    sidebar: "expanded",
    reduceMotion: false,
  },
  system: { dataRefresh: "5m", maintenanceMode: false },
};

// In-memory "database" so saved values survive a page reload while mocking.
let store: SettingsResponse = {
  settings: structuredClone(DEFAULT_SETTINGS),
  updatedAt: new Date().toISOString(),
};

export function readMockSettings(): SettingsResponse {
  return structuredClone(store);
}

export function writeMockSettings(settings: AdminSettings): SettingsResponse {
  store = { settings: structuredClone(settings), updatedAt: new Date().toISOString() };
  return structuredClone(store);
}
