import type { PersonalAccountProfile, ProfileChanges, PublicAuthClient } from "./client";
import { AuthClientError } from "./errors";

const sameAccount = (profile: PersonalAccountProfile, expected: PersonalAccountProfile) =>
  profile.id === expected.id && profile.role === expected.role && profile.email === expected.email;

const canonicalValue = (field: keyof ProfileChanges, value: string | null) => {
  if (field !== "phoneNumber") return value?.trim();
  return value?.startsWith("09") ? `+63${value.slice(1)}` : value;
};

/** One explicit mutation; an uncertain response permits one read, never a replay. */
export async function saveProfile(client: PublicAuthClient, expected: PersonalAccountProfile, changes: ProfileChanges) {
  if (!client.updateProfile) throw new AuthClientError("UNAVAILABLE");
  try {
    const profile = await client.updateProfile(changes);
    if (!sameAccount(profile, expected)) throw new AuthClientError("REQUEST_UNCERTAIN");
    return { profile, reconciled: false };
  } catch (cause) {
    const issue = cause instanceof AuthClientError ? cause : new AuthClientError("REQUEST_UNCERTAIN");
    if (issue.code !== "REQUEST_UNCERTAIN") throw issue;
    try {
      if (!client.getProfile) throw issue;
      const profile = await client.getProfile();
      const fields = (Object.keys(changes) as (keyof ProfileChanges)[]).filter(field => changes[field] !== undefined);
      if (sameAccount(profile, expected) && fields.every(field => profile[field] === canonicalValue(field, changes[field] ?? null))) {
        return { profile, reconciled: true };
      }
    } catch (readError) {
      if (readError instanceof AuthClientError && ["AUTHENTICATION_REQUIRED", "ACCOUNT_DISABLED",
        "EMAIL_VERIFICATION_REQUIRED", "TERMS_ACCEPTANCE_REQUIRED", "PASSWORD_RESET_REQUIRED", "LOGOUT_UNCERTAIN"].includes(readError.code)) throw readError;
    }
    throw issue;
  }
}
