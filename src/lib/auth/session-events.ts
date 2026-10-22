export const accountHintKey = "aventix:account-changed";
export const accountEvent = "aventix:session-updated";
export type AccountChange = "changed" | "signed-out" | "blocked" | "reset";

/** Signals invalidate account reads. Only /me supplies identity. */
export function notifyAccountChange(change: AccountChange) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(accountEvent, { detail: change }));
  if (change === "blocked") return;
  try {
    // A disposable nonce wakes other tabs without storing account or credential data.
    window.localStorage.setItem(accountHintKey, crypto.randomUUID());
    window.localStorage.removeItem(accountHintKey);
  } catch {
    // Storage can be disabled. Navigation/focus still reconcile with the server.
  }
}
