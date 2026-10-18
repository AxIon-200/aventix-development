import {
  AdminSettings,
  ChangePasswordInput,
  SettingsResponse,
} from "@/app/admin/types/settings";
import { DEMO, readMockSettings, writeMockSettings } from "@/app/admin/lib/mock/mockSettings";
import { API_BASE, delay } from "@/app/admin/services/api";

// Flip to false once the backend endpoints exist. Nothing in the hooks,
// components, or page needs to change.
const USE_MOCK = true;

// GET /admin/settings  ->  { settings, updatedAt }
export async function getSettings(): Promise<SettingsResponse> {
  if (USE_MOCK) {
    await delay(450);
    failIfDemo("Failed to load settings");
    return readMockSettings();
  }

  const res = await fetch(`${API_BASE}/admin/settings`);
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

// PUT /admin/settings  (body: the full AdminSettings object)  ->  { settings, updatedAt }
export async function updateSettings(settings: AdminSettings): Promise<SettingsResponse> {
  if (USE_MOCK) {
    await delay(600);
    failIfDemo("Failed to save settings");
    return writeMockSettings(settings);
  }

  const res = await fetch(`${API_BASE}/admin/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to save settings");
  return res.json();
}

// POST /admin/settings/password  (body: { currentPassword, newPassword })  ->  204
// The backend should reply 400/401 with { message } when the current password is wrong.
export async function changePassword(input: ChangePasswordInput): Promise<void> {
  if (USE_MOCK) {
    await delay(700);
    failIfDemo("Failed to change password");
    if (input.currentPassword !== DEMO.currentPassword) {
      throw new Error("Your current password is incorrect.");
    }
    DEMO.currentPassword = input.newPassword; // so the demo keeps working afterwards
    return;
  }

  const res = await fetch(`${API_BASE}/admin/settings/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? "Failed to change password");
  }
}

// ───────────── mock-only helpers ─────────────
function failIfDemo(message: string) {
  if (DEMO.failRequests) throw new Error(message);
}
