import {
  AdminProfile,
  ChangePasswordPayload,
  UpdateProfilePayload,
} from "@/app/admin/types/profile";
import { DEMO, mockCredentials, mockProfile } from "@/app/admin/lib/mock/mockProfile";
import { API_BASE, delay } from "@/app/admin/services/api";

// Flip to false once the backend endpoints exist. Nothing in the hooks,
// components, or page needs to change.
const USE_MOCK = true;

const MOCK_AVATAR_KEY = "aventix.admin.profile.avatar";

// Thrown for failures the form can show. When `field` is set, the form puts
// the message under that input instead of in a banner.
export class ProfileError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = "ProfileError";
    this.field = field;
  }
}

// Backend error contract for 4xx responses:  { "message": "...", "field"?: "email" }
async function failFrom(res: Response, fallback: string): Promise<never> {
  let body: { message?: string; field?: string } = {};
  try {
    body = await res.json();
  } catch {
    // not JSON: use the fallback message
  }
  throw new ProfileError(body.message || fallback, body.field);
}

// GET /admin/profile
export async function getProfile(): Promise<AdminProfile> {
  if (USE_MOCK) {
    await delay(450);
    failIfDemo("Failed to load your profile");

    // Restore the mock photo after navigation or a page refresh.
    if (typeof window !== "undefined") {
      try {
        const savedAvatar = window.localStorage.getItem(MOCK_AVATAR_KEY);

        if (savedAvatar) {
          (mockProfile as AdminProfile).avatarUrl = savedAvatar;
        }
      } catch {
        // Continue using the in-memory profile if storage is unavailable.
      }
    }

    return { ...mockProfile };
  }

  const res = await fetch(`${API_BASE}/admin/profile`, {
    method: "GET",
  });
  if (!res.ok) return failFrom(res, "Failed to load your profile");
  return res.json();
}

// PATCH /admin/profile   body: { fullName, email, phone }
// Errors: 409/422 with { message, field: "email" } when the email is taken.
export async function updateProfile(payload: UpdateProfilePayload): Promise<AdminProfile> {
  if (USE_MOCK) {
    await delay(600);
    failIfDemo("Failed to save your profile");
    if (payload.email.toLowerCase() === "taken@aventix.ph") {
      throw new ProfileError("This email is already in use.", "email");
    }
    mockProfile.fullName = payload.fullName;
    mockProfile.email = payload.email;
    mockProfile.phone = payload.phone || null;
    return { ...mockProfile };
  }

  const res = await fetch(`${API_BASE}/admin/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return failFrom(res, "Failed to save your profile");
  return res.json();
}

// POST /admin/profile/password   body: { currentPassword, newPassword }
// Errors: 400/401/422 with { message, field: "currentPassword" | "newPassword" }.
// The backend must re-check the strength rules, not trust the client.
export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  if (USE_MOCK) {
    await delay(700);
    failIfDemo("Failed to change your password");
    if (payload.currentPassword !== mockCredentials.password) {
      throw new ProfileError("Current password is incorrect.", "currentPassword");
    }
    if (payload.newPassword === payload.currentPassword) {
      throw new ProfileError("New password must be different from your current password.", "newPassword");
    }
    mockCredentials.password = payload.newPassword;
    mockProfile.passwordChangedAt = new Date().toISOString();
    return;
  }

  const res = await fetch(`${API_BASE}/admin/profile/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return failFrom(res, "Failed to change your password");
}

function failIfDemo(message: string) {
  if (DEMO.failRequests) throw new Error(message);
}



export async function uploadProfilePhoto(
  file: File
): Promise<{ avatarUrl: string }> {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const maxSize = 2 * 1024 * 1024;

  // Validate the file again at the service level.
  if (!allowedTypes.includes(file.type)) {
    throw new ProfileError(
      "Choose a JPG, PNG, or WebP image."
    );
  }

  if (file.size > maxSize) {
    throw new ProfileError(
      "The image must be 2 MB or smaller."
    );
  }

  // MOCK MODE: upload locally without requiring a backend endpoint.
  if (USE_MOCK) {
    await delay(500);
    failIfDemo("Failed to upload your profile photo");

    const avatarUrl = await new Promise<string>(
      (resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Could not read the selected image."));
          }
        };

        reader.onerror = () => {
          reject(new Error("Could not read the selected image."));
        };

        reader.readAsDataURL(file);
      }
    );

    // Update the shared mock profile so getProfile() returns the photo.
    (mockProfile as AdminProfile).avatarUrl = avatarUrl;

    // Save the mock image across page refreshes.
    try {
      window.localStorage.setItem(MOCK_AVATAR_KEY, avatarUrl);
    } catch {
      // The current session can still use the in-memory image.
    }

    return { avatarUrl };
  }

  // REAL API MODE: called after USE_MOCK is changed to false.
  const formData = new FormData();
  formData.append("photo", file);

  const response = await fetch(
    `${API_BASE}/admin/profile/photo`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    return failFrom(
      response,
      "Unable to upload your profile photo."
    );
  }

  const result = (await response.json()) as {
    avatarUrl?: unknown;
  };

  if (
    typeof result.avatarUrl !== "string" ||
    result.avatarUrl.trim() === ""
  ) {
    throw new ProfileError(
      "The server did not return a valid photo URL."
    );
  }

  return { avatarUrl: result.avatarUrl };
}


