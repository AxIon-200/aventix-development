import { AuthClientError } from "./errors";
import { accountFromProfile, accountDestination, isObject } from "./profile";
import type { PublicAuthClient } from "./client";
import { accountRequest } from "./transport";
import { notifyAccountChange as notify } from "./session-events";

export function createBetterAuthClient(transport: typeof fetch = (...args) => fetch(...args)): PublicAuthClient {
  let logoutBlocked = false;
  let pendingLogout: Promise<void> | undefined;
  const request = (path: string, body?: Record<string, unknown>) => accountRequest(transport, path, body);
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
