import { AuthClientError } from "./errors";
import { accountFromProfile, accountDestination, isObject, personalProfileFromResponse } from "./profile";
import type { PublicAuthClient } from "./client";
import { accountRequest } from "./transport";
import { notifyAccountChange as notify } from "./session-events";

export function createBetterAuthClient(transport: typeof fetch = (...args) => fetch(...args)): PublicAuthClient {
  let logoutBlocked = false;
  let pendingLogout: Promise<void> | undefined;
  const request = (path: string, body?: Record<string, unknown>) => accountRequest(transport, path, body);
  const requestCompletion = async (path: string, body: Record<string, unknown>) => {
    try { return await request(path, body); }
    catch (error) {
      if (error instanceof AuthClientError && ["UNAVAILABLE", "INVALID_RESPONSE"].includes(error.code)) throw new AuthClientError("REQUEST_UNCERTAIN", error.retryAfter);
      throw error;
    }
  };
  const readSession = async () => {
    try { return accountFromProfile(await request("/api/v1/me")); }
    catch (error) {
      if (error instanceof AuthClientError && error.code === "AUTHENTICATION_REQUIRED") return null;
      throw error;
    }
  };
  const getSession = async () => {
    if (logoutBlocked && pendingLogout) throw new AuthClientError("LOGOUT_UNCERTAIN");
    try {
      const session = await readSession();
      // A later defined refresh can confirm sign-out (including after reset),
      // but a remaining identity must never lift an uncertain-logout block.
      if (logoutBlocked) {
        if (pendingLogout || session) throw new AuthClientError("LOGOUT_UNCERTAIN");
        logoutBlocked = false;
      }
      return session;
    } catch (error) {
      if (logoutBlocked) throw new AuthClientError("LOGOUT_UNCERTAIN", error instanceof AuthClientError ? error.retryAfter : undefined);
      throw error;
    }
  };
  const logout = async () => {
      logoutBlocked = true;
      notify("blocked");
      try {
        const result = await request("/api/auth/logout", {});
        if (!isObject(result) || !isObject(result.data) || result.data.loggedOut !== true) throw new AuthClientError("INVALID_RESPONSE");
      } catch (error) {
        // A read can establish the result; an uncertain mutation is never repeated automatically.
        try {
          if (await readSession()) throw new AuthClientError("LOGOUT_UNCERTAIN");
        } catch {
          notify("blocked");
          throw new AuthClientError("LOGOUT_UNCERTAIN", error instanceof AuthClientError ? error.retryAfter : undefined);
        }
      }
      logoutBlocked = false;
      notify("signed-out");
  };
  return {
    getSession,
    getProfile: async () => {
      if (logoutBlocked) throw new AuthClientError("LOGOUT_UNCERTAIN");
      const profile = personalProfileFromResponse(await request("/api/v1/me"));
      if (logoutBlocked) throw new AuthClientError("LOGOUT_UNCERTAIN");
      return profile;
    },
    requestPasswordReset: async ({ email }) => {
      const result = await requestCompletion("/api/auth/request-password-reset", { email: email.trim().toLowerCase() });
      if (!isObject(result) || !isObject(result.data) || result.data.message !== "If an account exists for this address, a password-reset email will be sent.") throw new AuthClientError("REQUEST_UNCERTAIN");
    },
    resetPassword: async ({ token, newPassword }) => {
      const result = await requestCompletion("/api/auth/reset-password", { token, newPassword });
      if (!isObject(result) || !isObject(result.data) || result.data.passwordReset !== true) throw new AuthClientError("REQUEST_UNCERTAIN");
      notify("reset");
    },
    verifyEmail: async ({ token, currentPassword }) => {
      const result = await requestCompletion("/api/auth/verify-email", { token, currentPassword });
      if (!isObject(result) || !isObject(result.data) || result.data.emailVerified !== true) throw new AuthClientError("REQUEST_UNCERTAIN");
    },
    resendVerification: async ({ email }) => {
      const result = await requestCompletion("/api/auth/resend-verification", { email: email.trim().toLowerCase() });
      if (!isObject(result) || !isObject(result.data) || result.data.message !== "If this address is eligible, a verification email will be sent.") throw new AuthClientError("REQUEST_UNCERTAIN");
    },
    getTerms: async () => {
      const result = await request("/api/v1/terms");
      if (!isObject(result) || !isObject(result.data)) throw new AuthClientError("INVALID_RESPONSE");
      const { version, documentUrl } = result.data;
      if (typeof version !== "string" || !version.trim() || typeof documentUrl !== "string") throw new AuthClientError("INVALID_RESPONSE");
      let url: URL;
      try { url = new URL(documentUrl); } catch { throw new AuthClientError("INVALID_RESPONSE"); }
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new AuthClientError("INVALID_RESPONSE");
      return { version, documentUrl };
    },
    acceptTerms: async data => {
      const result = await requestCompletion("/api/auth/accept-terms", {
        email: data.email.trim().toLowerCase(), currentPassword: data.currentPassword,
        termsAccepted: data.termsAccepted, termsVersion: data.termsVersion,
      });
      if (!isObject(result) || !isObject(result.data) || result.data.termsAccepted !== true) throw new AuthClientError("REQUEST_UNCERTAIN");
    },
    registerAttendee: async data => {
      let result: unknown;
      try {
        result = await request("/api/auth/register", {
          firstName: data.firstName.trim(), lastName: data.lastName.trim(), email: data.email.trim().toLowerCase(),
          password: data.password, ...(data.phoneNumber === "" || data.phoneNumber === undefined ? {} : { phoneNumber: data.phoneNumber }),
          termsAccepted: data.termsAccepted, termsVersion: data.termsVersion,
        });
      } catch (error) {
        // An unsupported gateway error may replace the response after creation.
        if (error instanceof AuthClientError && error.code === "UNAVAILABLE") throw new AuthClientError("REQUEST_UNCERTAIN", error.retryAfter);
        throw error;
      }
      if (!isObject(result) || !isObject(result.data) || result.data.verificationRequired !== true) throw new AuthClientError("REQUEST_UNCERTAIN");
    },
    login: async data => {
      const email = data.email.trim().toLowerCase();
      const loggedIn = accountFromProfile(await request("/api/auth/login", { email, password: data.password }));
      const current = await getSession();
      if (!loggedIn || !current || current.userId !== loggedIn.userId || current.email !== email) throw new AuthClientError("INVALID_RESPONSE");
      notify("changed");
      return { destination: accountDestination(current), allowBookingReturn: current.canBook };
    },
    logout: () => {
      pendingLogout ??= logout().finally(() => { pendingLogout = undefined; });
      return pendingLogout;
    },
  };
}
