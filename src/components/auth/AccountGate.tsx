import Link from "next/link";
import { authErrorMessage, AuthClientError, type AuthErrorCode } from "@/lib/auth/client";
import { authHref } from "@/lib/auth/destination";
import { validEmail } from "@/lib/auth/validation";

/** Follow the server's eligibility gate without carrying credentials. */
export default function AccountGate({ code, returnTo, email }: { code: AuthErrorCode; returnTo?: string; email?: string }) {
  const action = code === "EMAIL_VERIFICATION_REQUIRED" ? { href: "/verify-email", label: "Email verification" }
    : code === "TERMS_ACCEPTANCE_REQUIRED" ? { href: "/accept-terms", label: "Accept current terms" }
    : code === "PASSWORD_RESET_REQUIRED" ? { href: "/forgot-password", label: "Reset password" } : undefined;
  const href = action && authHref(action.href, returnTo);
  const prefill = code === "TERMS_ACCEPTANCE_REQUIRED" && email && email.length <= 254 && validEmail(email) ? email.trim().toLowerCase() : undefined;
  const actionHref = prefill && href ? `${href}${href.includes("?") ? "&" : "?"}email=${encodeURIComponent(prefill)}` : href;
  return <div role="alert" className="my-3 text-sm text-amber-200">
    <p>{authErrorMessage(new AuthClientError(code))}</p>
    {action && actionHref && <Link className="mt-2 inline-block text-[#66fcf1] underline" href={actionHref}>{action.label}</Link>}
  </div>;
}
