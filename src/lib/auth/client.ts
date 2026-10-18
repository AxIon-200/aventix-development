/** Frontend adapter only. Moyamoy's session/API implementation is not supplied.
 * Implement these methods using the agreed client; never store credentials or
 * tokens in localStorage, assign roles, or infer authentication from UI state.
 * The adapter must establish the server session before resolving login.
 */
export type AttendeeRegistration = {
  firstName: string; lastName: string; email: string; phoneNumber: string;
  password: string; termsAccepted: true;
};
export type AuthResult = { destination?: string; allowBookingReturn?: boolean };
export interface AccountSession {
  userId: string;
  displayName: string;
  /** Effective booking eligibility from the shared backend/session client. */
  canBook: boolean;
  navigation?: { label: string; href: string }[];
}
export type AuthErrorCode = "INVALID_CREDENTIALS" | "ACCOUNT_DISABLED" | "DUPLICATE_EMAIL" |
  "INVALID_RECOVERY_LINK" | "EXPIRED_RECOVERY_LINK" | "USED_RECOVERY_LINK" | "RATE_LIMITED" | "UNAVAILABLE";
export class AuthClientError extends Error {
  constructor(public code: AuthErrorCode) { super(code); }
}
export interface PublicAuthClient {
  rememberMeSupported: boolean;
  getSession?: () => Promise<AccountSession | null>;
  logout?: () => Promise<void>;
  passwordRules?: { description: string; validate: (password: string) => string | undefined };
  login?: (data: { email: string; password: string; rememberMe?: boolean }) => Promise<AuthResult>;
  registerAttendee?: (data: AttendeeRegistration) => Promise<void>;
  requestPasswordReset?: (data: { email: string }) => Promise<void>;
  // The agreed adapter extracts/verifies its own backend-issued link format.
  verifyRecoveryLink?: (link: string) => Promise<void>;
  resetPassword?: (data: { recoveryLink: string; password: string }) => Promise<void>;
}

export const publicAuthClient: PublicAuthClient = { rememberMeSupported: false };

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof AuthClientError)) return "We couldn’t complete your request. Please try again.";
  const messages: Record<AuthErrorCode, string> = {
    INVALID_CREDENTIALS: "The email address or password is incorrect.",
    ACCOUNT_DISABLED: "This account cannot sign in. Please contact support.",
    DUPLICATE_EMAIL: "This email is already registered. Log in or reset your password.",
    INVALID_RECOVERY_LINK: "This recovery link is invalid. Request a new link.",
    EXPIRED_RECOVERY_LINK: "This recovery link has expired. Request a new link.",
    USED_RECOVERY_LINK: "This recovery link has already been used. Request a new link.",
    RATE_LIMITED: "Too many attempts. Please wait before trying again.",
    UNAVAILABLE: "This service is not connected yet. Your details have not been submitted.",
  };
  return messages[error.code];
}
