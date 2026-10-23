import type { AttendeeRegistration } from "./client";

export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
/** Only the two approved Philippine mobile formats; formatting is not repaired. */
export function validPhone(value: string): boolean {
  return /^(?:09[0-9]{9}|\+639[0-9]{9})$/.test(value);
}
export function passwordError(value: string): string | undefined {
  if (!value.isWellFormed() || [...value].length < 15 || [...value].length > 128) return "Use 15–128 Unicode characters. Spaces are allowed.";
}
export function nameError(value: string): string | undefined {
  const name = value.trim();
  if (!name.isWellFormed() || name.includes("\u0000") || [...name].length < 1 || [...name].length > 100) return "Use 1–100 Unicode characters.";
}
/** Explicit allowlist: confirmation and caller-supplied roles never leave the form. */
export function attendeePayload(data: FormData, termsVersion: string): AttendeeRegistration {
  const phoneNumber = String(data.get("phoneNumber") ?? "");
  return {
    firstName: String(data.get("firstName") ?? "").trim(),
    lastName: String(data.get("lastName") ?? "").trim(),
    email: String(data.get("email") ?? "").trim().toLowerCase(),
    ...(phoneNumber === "" ? {} : { phoneNumber }),
    password: String(data.get("password") ?? ""),
    termsAccepted: data.get("terms") === "on",
    termsVersion,
  };
}
