import type { AdminSettings, ChangePasswordInput, SettingsResponse } from "@/app/admin/types/settings";
import { authErrorMessage, publicAuthClient } from "@/lib/auth/client";

export const SETTINGS_SAVED_EVENT = "aventix-admin-settings-saved";

async function requestSettings(init?: RequestInit): Promise<SettingsResponse> {
  const response = await fetch("/api/v1/admin/settings", { ...init, credentials: "include", cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "Settings are unavailable. Please try again.");
  if (!body?.settings?.general || !body?.settings?.appearance ||
      (body.updatedAt !== null && !Number.isFinite(Date.parse(body.updatedAt)))) {
    throw new Error("Invalid settings response.");
  }
  return body;
}

export function getSettings(): Promise<SettingsResponse> {
  return requestSettings();
}

export async function updateSettings(settings: AdminSettings): Promise<SettingsResponse> {
  const saved = await requestSettings({ method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
  window.dispatchEvent(new CustomEvent(SETTINGS_SAVED_EVENT, { detail: saved.settings }));
  return saved;
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  try {
    await publicAuthClient.changePassword!(input);
  } catch (error) {
    throw new Error(authErrorMessage(error));
  }
}
