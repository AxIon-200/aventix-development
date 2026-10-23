import { AuthClientError, type AuthErrorCode } from "./errors";
import { isObject } from "./profile";

const publicCodes: AuthErrorCode[] = ["INVALID_CREDENTIALS", "ACCOUNT_DISABLED", "EMAIL_VERIFICATION_REQUIRED",
  "TERMS_ACCEPTANCE_REQUIRED", "PASSWORD_RESET_REQUIRED", "AUTHENTICATION_REQUIRED", "VALIDATION_ERROR", "RATE_LIMITED",
  "EMAIL_ALREADY_REGISTERED", "ACCOUNT_CREATED_EMAIL_FAILED", "TERMS_VERSION_OUTDATED", "CURRENT_PASSWORD_INCORRECT", "LINK_INVALID_OR_EXPIRED", "PASSWORD_REUSE"];

/** Decode only public envelopes. Provider messages and unknown field values never reach the UI. */
export async function accountRequest(transport: typeof fetch, url: string, body?: Record<string, unknown>, cookie?: string): Promise<unknown> {
  const mutation = body !== undefined;
  let response: Response;
  try {
    response = await transport(url, {
      method: mutation ? "POST" : "GET", credentials: "include", cache: "no-store", redirect: "error",
      headers: { Accept: "application/json", ...(mutation ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      ...(mutation ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
    });
  } catch { throw new AuthClientError(mutation ? "REQUEST_UNCERTAIN" : "UNAVAILABLE"); }
  let value: unknown;
  try { value = await response.json(); }
  catch { throw new AuthClientError(mutation ? "REQUEST_UNCERTAIN" : response.ok ? "INVALID_RESPONSE" : "UNAVAILABLE"); }
  if (!response.ok) {
    const error = isObject(value) && isObject(value.error) ? value.error : {};
    const code = response.status === 429 ? "RATE_LIMITED" : publicCodes.find(code => code === error.code) ?? "UNAVAILABLE";
    const retry = response.headers.get("Retry-After");
    const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : retry ? Math.ceil((Date.parse(retry) - Date.now()) / 1000) : NaN;
    const fields: Record<string, string> = {};
    if (code === "VALIDATION_ERROR") {
      const supplied = isObject(error.fields) ? error.fields : isObject(error.fieldErrors) ? error.fieldErrors : {};
      if (Object.hasOwn(supplied, "email")) fields.email = "Enter a valid email address.";
      if (Object.hasOwn(supplied, "password")) fields.password = "Enter your password using at most 128 characters.";
      if (Object.hasOwn(supplied, "currentPassword")) fields.currentPassword = "Enter your current password using at most 128 Unicode characters.";
      if (Object.hasOwn(supplied, "firstName")) fields.firstName = "Use 1–100 Unicode characters for your first name.";
      if (Object.hasOwn(supplied, "lastName")) fields.lastName = "Use 1–100 Unicode characters for your last name.";
      if (Object.hasOwn(supplied, "phoneNumber")) fields.phoneNumber = "Use 09 plus nine digits or +639 plus nine digits, without spaces or hyphens.";
      if (Object.hasOwn(supplied, "termsAccepted") || Object.hasOwn(supplied, "termsVersion")) fields.terms = "Read and explicitly accept the current terms.";
    }
    throw new AuthClientError(code, Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined, fields);
  }
  if (!isObject(value) || !isObject(value.data) || "error" in value) throw new AuthClientError("INVALID_RESPONSE");
  return value;
}
