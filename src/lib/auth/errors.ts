export type AuthErrorCode = "INVALID_CREDENTIALS" | "ACCOUNT_DISABLED" | "DUPLICATE_EMAIL" |
  "INVALID_RECOVERY_LINK" | "EXPIRED_RECOVERY_LINK" | "USED_RECOVERY_LINK" | "RATE_LIMITED" |
  "UNAVAILABLE" | "EMAIL_NOT_VERIFIED" | "REQUEST_UNCERTAIN" | "INVALID_RESPONSE";

export class AuthClientError extends Error {
  constructor(public code: AuthErrorCode) { super(code); this.name = "AuthClientError"; }
}
