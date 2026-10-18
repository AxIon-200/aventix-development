import type { AttendeeRegistration } from "./client";

export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
/** Accept Philippine mobile numbers and international E.164-style numbers. */
export function normalizePhone(value: string): string | undefined {
  const n = value.replace(/[ ()-]/g, "");
  if (/^09\d{9}$/.test(n)) return `+63${n.slice(1)}`;
  if (/^639\d{9}$/.test(n)) return `+${n}`;
  if (/^\+[1-9]\d{7,14}$/.test(n)) return n;
}
export function passwordError(value: string): string | undefined {
  // Provisional UI minimum. Replace with the agreed server rules in the adapter.
  if (value.length < 8) return "Use at least 8 characters.";
  if (!value.trim()) return "Your password cannot contain only spaces.";
}
/** Explicit allowlist: confirmation and caller-supplied roles never leave the form. */
export function attendeePayload(data: FormData): AttendeeRegistration {
  return {
    firstName: String(data.get("firstName") ?? "").trim(),
    lastName: String(data.get("lastName") ?? "").trim(),
    email: String(data.get("email") ?? "").trim(),
    phoneNumber: normalizePhone(String(data.get("phoneNumber") ?? "")) ?? "",
    password: String(data.get("password") ?? ""),
    termsAccepted: true,
  };
}
