import { AdminProfile } from "@/app/admin/types/profile";

// ─────────────────────────────────────────────────────────────
// DEMO SWITCH — only used while USE_MOCK is true in profileService.ts
//   failRequests: true = every request fails (preview the error states)
//
// Try these in the mock:
//   • current password is "admin123"  (wrong one -> "Current password is incorrect.")
//   • saving the email "taken@aventix.ph" -> "This email is already in use."
// ─────────────────────────────────────────────────────────────
export const DEMO = {
  failRequests: false,
};

const DAY = 86_400_000;

// Unlike the list pages, a profile always exists, so there is no "empty" mode.
// Mutable on purpose: saving really changes what the page shows after a refetch.
export const mockProfile: AdminProfile = {
  id: "admin-1",
  fullName: "Admin User",
  email: "admin@aventix.ph",
  phone: "+63 917 555 0123",
  role: "admin",
  roleLabel: "Administrator",
  status: "active",
  avatarUrl: null,
  lastLoginAt: new Date(Date.now() - 3_600_000).toISOString(),
  createdAt: new Date(Date.now() - 55 * DAY).toISOString(),
  passwordChangedAt: new Date(Date.now() - 18 * DAY).toISOString(),
  twoFactorEnabled: false,
};

export const mockCredentials = { password: "admin123" };
