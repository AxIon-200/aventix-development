import { AuthClientError, type AccountSession, type AuthErrorCode, type PublicAuthClient } from "./client";
import { accountEvent, accountHintKey } from "./session-events";

export type AccountState = { loading: boolean; session: AccountSession | null; unavailable: boolean; error?: AuthErrorCode };
export const checkingAccount: AccountState = { loading: true, session: null, unavailable: false };

/** One current-account read/state per transport, shared by every mounted consumer. */
function createAccountSession(client: PublicAuthClient) {
  let state = checkingAccount;
  let sequence = 0;
  let route: string | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: AccountState) => {
    state = next;
    listeners.forEach(listener => listener());
  };
  const clear = () => {
    ++sequence;
    publish({ loading: false, session: null, unavailable: false });
  };
  const refresh = async () => {
    const current = ++sequence;
    publish(checkingAccount);
    try {
      if (!client.getSession) throw new AuthClientError("UNAVAILABLE");
      const session = await client.getSession();
      if (current === sequence) publish({ loading: false, session, unavailable: false });
    } catch (error) {
      if (current === sequence) publish({ loading: false, session: null, unavailable: true,
        error: error instanceof AuthClientError ? error.code : "UNAVAILABLE" });
    }
  };
  const retry = () => { void refresh(); };
  const changed = (event: Event) => {
    const change: unknown = (event as CustomEvent).detail;
    if (change === "signed-out") {
      clear();
      retry();
    }
    else if (change === "blocked") {
      ++sequence;
      publish({ loading: false, session: null, unavailable: true, error: "LOGOUT_UNCERTAIN" });
    } else retry();
  };
  const visible = () => { if (document.visibilityState === "visible") retry(); };
  const storage = (event: StorageEvent) => {
    if (event.key === accountHintKey && event.newValue !== null && event.storageArea === window.localStorage) retry();
  };
  return {
    getSnapshot: () => state,
    // A new page cannot use an account checked for the previous navigation,
    // even before AccountNavigationRefresh's effect starts the next read.
    getSnapshotForRoute: (currentRoute: string) => route === currentRoute ? state : checkingAccount,
    retry,
    clear,
    navigate: (nextRoute: string) => {
      if (route !== undefined && route !== nextRoute) retry();
      route = nextRoute;
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (listeners.size === 1) {
        window.addEventListener(accountEvent, changed);
        window.addEventListener("focus", retry);
        window.addEventListener("storage", storage);
        document.addEventListener("visibilitychange", visible);
        retry();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        ++sequence;
        state = checkingAccount;
        route = undefined;
        window.removeEventListener(accountEvent, changed);
        window.removeEventListener("focus", retry);
        window.removeEventListener("storage", storage);
        document.removeEventListener("visibilitychange", visible);
      };
    },
  };
}

const accounts = new WeakMap<PublicAuthClient, ReturnType<typeof createAccountSession>>();
export function accountSession(client: PublicAuthClient) {
  let account = accounts.get(client);
  if (!account) {
    account = createAccountSession(client);
    accounts.set(client, account);
  }
  return account;
}
