import type { AdminProfile } from "@/app/admin/types/profile";

export class ProfileError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ProfileError";
  }
}

export async function getProfile(): Promise<AdminProfile> {
  const response = await fetch("/api/v1/admin/profile", { credentials: "include", cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new ProfileError(body?.error?.message ?? "Could not load your profile.");
  if (!body?.data?.id || body.data.role !== "admin") throw new ProfileError("Invalid profile response.");
  return body.data;
}

// The older upload component cannot present a browser-local photo as saved.
export async function uploadProfilePhoto(_file: File): Promise<{ avatarUrl: string }> {
  void _file;
  throw new ProfileError("Profile photo uploads are not available yet.");
}
