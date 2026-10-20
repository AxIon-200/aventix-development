import { createBetterAuthClient } from "./better-auth";
import { AuthClientError, type AuthErrorCode } from "./errors";
/** Frontend adapter for the approved Aventix HTTP contracts.
 * Credentials and session tokens are never stored in browser storage.
 * Login confirms the permitted current account before authorizing navigation.
 */
export type AttendeeRegistration = {
  firstName: string; lastName: string; email: string; phoneNumber: string;
  password: string; termsAccepted: true;
};
export type AuthResult = { destination?: string; allowBookingReturn?: boolean };
export interface AccountSession {
  userId: string;
  displayName: string;
  email?: string;
  /** Effective booking eligibility from the shared backend/session client. */
  canBook: boolean;
  navigation?: { label: string; href: string }[];
}
export { AuthClientError } from "./errors";
export type { AuthErrorCode } from "./errors";
export interface PublicAuthClient {
  getSession?: () => Promise<AccountSession | null>;
  logout?: () => Promise<void>;
  passwordRules?: { description: string; validate: (password: string) => string | undefined };
  login?: (data: { email: string; password: string }) => Promise<AuthResult>;
  registerAttendee?: (data: AttendeeRegistration) => Promise<void | AuthResult>;
  requestPasswordReset?: (data: { email: string }) => Promise<void>;
  // The agreed adapter extracts/verifies its own backend-issued link format.
  verifyRecoveryLink?: (link: string) => Promise<void>;
  resetPassword?: (data: { recoveryLink: string; password: string }) => Promise<void>;
}

export const publicAuthClient: PublicAuthClient = createBetterAuthClient();

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
    UNAVAILABLE: "The account service is unavailable. Check the backend connection and try again.",
    EMAIL_NOT_VERIFIED: "Verify your email address before logging in.",
    EMAIL_VERIFICATION_REQUIRED: "Verify your email address before logging in.",
    TERMS_ACCEPTANCE_REQUIRED: "Accept the current terms with your password before logging in separately.",
    PASSWORD_RESET_REQUIRED: "Reset your password through account recovery before logging in.",
    AUTHENTICATION_REQUIRED: "Your session has ended. Please log in again.",
    VALIDATION_ERROR: "Check your account details and try again.",
    LOGOUT_UNCERTAIN: "Sign-out could not be confirmed. Protected content is unavailable. Retry sign-out to continue.",
    REQUEST_UNCERTAIN: "We could not confirm the request. It may have reached the server. Check your current account before trying again.",
    INVALID_RESPONSE: "The account service returned an unsupported response or no verified session. Please try logging in again.",
  };
  return messages[error.code] + (error.retryAfter !== undefined ? ` Try again in ${error.retryAfter} seconds.` : "");
}
