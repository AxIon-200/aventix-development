import { createHash } from "node:crypto";
import { env } from "../config/env.js";

function createEmailLinkLanding(kind: "verification" | "reset") {
const reset = kind === "reset";
const title = reset ? "password reset" : "email verification";
const instructions = reset
  ? "Continue, then explicitly submit a different new password. Success revokes every session of the reset account and signs this browser out. Another account's other devices stay signed in. Log in separately afterward."
  : "Continue, then explicitly submit your current password. Verification never signs you in or changes your signed-in identity.";
// The token stays in this script's closure. No link is constructed until Continue.
const destination = JSON.stringify(new URL(reset ? "/reset-password" : "/verify-email", env.FRONTEND_URL).href).replace(/</g, "\\u003c");
const script = `(() => {
  let token;
  function capture() {
    const fragment = new URLSearchParams(location.hash.slice(1));
    token = fragment.getAll('token').length === 1 ? fragment.get('token') : null;
    history.replaceState(null, '', location.pathname);
    render();
  }
  function render() {
    const button = document.getElementById('continue');
    if (!button) return;
    button.disabled = !token;
    document.getElementById('instructions').textContent = token
      ? ${JSON.stringify(instructions)}
      : 'Reopen the link in your email to continue. Reloading this page removes access to the link token.';
  }
  capture();
  window.addEventListener('hashchange', capture);
  document.addEventListener('DOMContentLoaded', () => {
    render();
    const button = document.getElementById('continue');
    button.addEventListener('click', () => {
      if (!token) return;
      const target = new URL(${destination});
      target.hash = new URLSearchParams({token}).toString();
      location.assign(target.href);
    });
  });
})();`;

return {
  policy: `default-src 'none'; script-src 'sha256-${createHash("sha256").update(script).digest("base64")}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>Continue ${title} | Aventix</title><script>${script}</script></head><body><main><h1>${reset ? "Password reset" : "Email verification"}</h1><p id="instructions">Reopen the link in your email to continue. Reloading this page removes access to the link token.</p><button id="continue" type="button" disabled>Continue to ${title}</button><noscript>Enable JavaScript and reopen your email link to continue.</noscript></main></body></html>`,
};
}

export const verificationLanding = createEmailLinkLanding("verification");
export const passwordResetLanding = createEmailLinkLanding("reset");
