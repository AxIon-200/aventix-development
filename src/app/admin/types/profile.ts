export type AdminRole = "admin" | "superadmin";

// GET /admin/profile
export type AdminProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: AdminRole;
  roleLabel: string; // display text, e.g. "Administrator"
  status: "active" | "inactive";
  avatarUrl?: string | null;
  lastLoginAt: string | null; // ISO
  createdAt: string; // ISO
  passwordChangedAt: string | null; // ISO
  twoFactorEnabled: boolean | null;
};

// PATCH /admin/profile
export type UpdateProfilePayload = {
  fullName: string;
  email: string;
  phone: string; // "" clears it
};

// POST /admin/profile/password   ("confirm new password" is checked on the client only)
export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};
