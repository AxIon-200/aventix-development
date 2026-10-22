import { authBackendOrigin } from "./backend-origin";
import { accountRequest } from "./transport";
import { accountFromProfile } from "./profile";
import { AuthClientError } from "./errors";

/** The requesting cookie is explicit. Never memoize this across requests. */
export async function readServerAccount(cookie: string, transport: typeof fetch = (...args) => fetch(...args)) {
  try { return accountFromProfile(await accountRequest(transport, `${authBackendOrigin()}/api/v1/me`, undefined, cookie)); }
  catch (error) {
    if (error instanceof AuthClientError && error.code === "AUTHENTICATION_REQUIRED") return null;
    throw error;
  }
}
