import { AuthClientError, type AuthErrorCode } from "./errors";
import { isObject } from "./profile";

const publicCodes: AuthErrorCode[] = ["INVALID_CREDENTIALS", "ACCOUNT_DISABLED", "EMAIL_VERIFICATION_REQUIRED",
  "TERMS_ACCEPTANCE_REQUIRED", "PASSWORD_RESET_REQUIRED", "AUTHENTICATION_REQUIRED", "VALIDATION_ERROR", "RATE_LIMITED"];

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
    }
    throw new AuthClientError(code, Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined, fields);
  }
  if (!isObject(value) || !isObject(value.data) || "error" in value) throw new AuthClientError("INVALID_RESPONSE");
  return value;
}
