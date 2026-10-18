import { AuthClientError } from "./errors";
import type { AccountSession, AuthResult, PublicAuthClient } from "./client";

type Transport = typeof fetch;
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** Map only server-issued roles/status. This controls UI destinations, not server authorization. */
export function accountFromSession(value: unknown): AccountSession | null {
  if (value === null) return null;
  if (!isObject(value) || !isObject(value.user) || !isObject(value.session)) throw new AuthClientError("INVALID_RESPONSE");
  const { user, session } = value;
  if (typeof user.id !== "string" || !user.id || typeof user.name !== "string" || typeof user.email !== "string" ||
      session.userId !== user.id || typeof session.expiresAt !== "string" || !Number.isFinite(Date.parse(session.expiresAt))) {
    throw new AuthClientError("INVALID_RESPONSE");
  }
  if (Date.parse(session.expiresAt) <= Date.now()) return null;
  if (user.status !== "ACTIVE") throw new AuthClientError("ACCOUNT_DISABLED");
  let navigation: AccountSession["navigation"];
  switch (user.role) {
    case "ATTENDEE": navigation = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "My Tickets", href: "/dashboard/tickets" },
      { label: "Booking History", href: "/dashboard/booking-history" },
      { label: "Profile", href: "/dashboard/profile" },
    ]; break;
    case "ORGANIZER": navigation = [{ label: "Organizer dashboard", href: "/organizer/dashboard" }]; break;
    case "ADMINISTRATOR": navigation = [{ label: "Administrator dashboard", href: "/admin/dashboard" }]; break;
    default: throw new AuthClientError("INVALID_RESPONSE");
  }
  return { userId: user.id, displayName: user.name.trim() || "Account", email: user.email, canBook: user.role === "ATTENDEE", navigation };
}

function publishSessionChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("aventix:session-updated"));
}
function destination(session: AccountSession): AuthResult {
  return { destination: session.navigation?.[0]?.href ?? "/events", allowBookingReturn: session.canBook };
}

/** Better Auth's documented endpoints; the supplied backend still needs to mount its existing handler.
 * Requests stay same-origin through the Next rewrite. Session cookies stay HttpOnly; tokens are never stored here.
 */
export function createBetterAuthClient(transport: Transport = (...args) => fetch(...args)): PublicAuthClient {
  async function request(path: string, body?: Record<string, unknown>): Promise<unknown> {
    let response: Response;
    try {
      response = await transport(`/api/auth/${path}`, {
        method: body ? "POST" : "GET", credentials: "include", cache: "no-store",
        headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new AuthClientError(body ? "REQUEST_UNCERTAIN" : "UNAVAILABLE");
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new AuthClientError("UNAVAILABLE"); }
    if (!response.ok) {
      const code = isObject(data) && typeof data.code === "string" ? data.code : "";
      if (response.status === 429) throw new AuthClientError("RATE_LIMITED");
      if (["USER_ALREADY_EXISTS", "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"].includes(code)) throw new AuthClientError("DUPLICATE_EMAIL");
      if (code === "EMAIL_NOT_VERIFIED") throw new AuthClientError("EMAIL_NOT_VERIFIED");
      if (["USER_BANNED", "ACCOUNT_DISABLED"].includes(code)) throw new AuthClientError("ACCOUNT_DISABLED");
      if (path === "sign-in/email" && (response.status === 401 || code === "INVALID_EMAIL_OR_PASSWORD")) throw new AuthClientError("INVALID_CREDENTIALS");
      if (path === "get-session" && response.status === 401) return null;
      throw new AuthClientError("UNAVAILABLE");
    }
    return data;
  }
  const getSession = async () => accountFromSession(await request("get-session"));
  return {
    rememberMeSupported: true,
    passwordRules: { description: "Use 8–128 characters.", validate: password => password.length < 8 || password.length > 128 ? "Use between 8 and 128 characters." : undefined },
    checkConnection: async () => {
      try { const value = await request("ok"); return isObject(value) && value.ok === true; } catch { return false; }
    },
    getSession,
    login: async data => {
      await request("sign-in/email", { email: data.email, password: data.password, rememberMe: data.rememberMe === true });
      const session = await getSession();
      if (!session || session.email?.toLowerCase() !== data.email.trim().toLowerCase()) throw new AuthClientError("INVALID_RESPONSE");
      publishSessionChange();
      return destination(session);
    },
    registerAttendee: async data => {
      if (data.termsAccepted !== true) throw new AuthClientError("INVALID_RESPONSE");
      // termsAcceptedAt/termsVersion are server-only fields in the current backend.
      // The checked UI acceptance cannot yet be persisted by this contract; see the handoff.
      const result = await request("sign-up/email", {
        name: `${data.firstName.trim()} ${data.lastName.trim()}`.trim(),
        firstName: data.firstName.trim(), lastName: data.lastName.trim(), email: data.email.trim(),
        phoneNumber: data.phoneNumber, password: data.password,
      });
      if (!isObject(result) || !isObject(result.user) || typeof result.user.id !== "string" || (typeof result.user.email !== "string" || result.user.email.toLowerCase() !== data.email.trim().toLowerCase())) throw new AuthClientError("INVALID_RESPONSE");
      // Better Auth auto-signs in by default. Only a verified session authorizes navigation.
      try {
        const session = await getSession();
        if (session && session.userId === result.user.id && session.email?.toLowerCase() === data.email.trim().toLowerCase() && session.canBook) { publishSessionChange(); return destination(session); }
      } catch { /* Signup was confirmed; ask the user to log in if its session could not be verified. */ }
    },
    logout: async () => {
      const result = await request("sign-out", {});
      if (!isObject(result) || result.success !== true) throw new AuthClientError("INVALID_RESPONSE");
      const session = await getSession();
      if (session) throw new AuthClientError("INVALID_RESPONSE");
      publishSessionChange();
    },
    // No recovery transport: sendResetPassword/token verification are not supplied by the backend.
  };
}
