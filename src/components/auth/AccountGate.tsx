import Link from "next/link";
import { authErrorMessage, AuthClientError, type AuthErrorCode } from "@/lib/auth/client";
import { authHref } from "@/lib/auth/destination";

/** Keep eligibility destinations distinct; their forms are delivered by the next S01 slices. */
export default function AccountGate({ code, returnTo }: { code: AuthErrorCode; returnTo?: string }) {
  const action = code === "EMAIL_VERIFICATION_REQUIRED" ? { href: "/verify-email", label: "Email verification" }
    : code === "TERMS_ACCEPTANCE_REQUIRED" ? { href: "/accept-terms", label: "Accept current terms" }
    : code === "PASSWORD_RESET_REQUIRED" ? { href: "/forgot-password", label: "Reset password" } : undefined;
  return <div role="alert" className="my-3 text-sm text-amber-200">
    <p>{authErrorMessage(new AuthClientError(code))}</p>
    {action && <Link className="mt-2 inline-block text-[#66fcf1] underline" href={authHref(action.href, returnTo)}>{action.label}</Link>}
  </div>;
}
