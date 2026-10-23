import { createBetterAuthClient } from "./better-auth";
import { AuthClientError, type AuthErrorCode } from "./errors";
/** Frontend adapter for the approved Aventix HTTP contracts.
 * Credentials and session tokens are never stored in browser storage.
 * Login confirms the permitted current account before authorizing navigation.
 */
export type AttendeeRegistration = {
  firstName: string; lastName: string; email: string; phoneNumber?: string;
  password: string; termsAccepted: boolean; termsVersion: string;
};
export type CurrentTerms = { version: string; documentUrl: string };
export type TermsAcceptance = { email: string; currentPassword: string; termsAccepted: boolean; termsVersion: string };
export type AuthResult = { destination?: string; allowBookingReturn?: boolean };
export type AccountRole = "ATTENDEE" | "ORGANIZER" | "ADMINISTRATOR";
export type PersonalAccountProfile = {
  id: string; firstName: string; lastName: string; name: string;
  email: string; phoneNumber: string | null; role: AccountRole;
};
export interface AccountSession {
  userId: string;
  role: AccountRole;
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
  getProfile?: () => Promise<PersonalAccountProfile>;
  logout?: () => Promise<void>;
  passwordRules?: { description: string; validate: (password: string) => string | undefined };
  login?: (data: { email: string; password: string }) => Promise<AuthResult>;
  getTerms?: () => Promise<CurrentTerms>;
  acceptTerms?: (data: TermsAcceptance) => Promise<void>;
  registerAttendee?: (data: AttendeeRegistration) => Promise<void>;
  verifyEmail?: (data: { token: string; currentPassword: string }) => Promise<void>;
  resendVerification?: (data: { email: string }) => Promise<void>;
  requestPasswordReset?: (data: { email: string }) => Promise<void>;
  resetPassword?: (data: { token: string; newPassword: string }) => Promise<void>;
}

export const publicAuthClient: PublicAuthClient = createBetterAuthClient();

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof AuthClientError)) return "We couldn’t complete your request. Please try again.";
  const messages: Record<AuthErrorCode, string> = {
    PASSWORD_REUSE: "Choose a new password that differs from your current password. This link can still be used.",
    INVALID_CREDENTIALS: "The email address or password is incorrect.",
    CURRENT_PASSWORD_INCORRECT: "The current password is incorrect. Try again with the same email link.",
    LINK_INVALID_OR_EXPIRED: "Link is invalid or expired. Request another verification email or recover your password.",
    ACCOUNT_DISABLED: "This account cannot sign in. Please contact support.",
    DUPLICATE_EMAIL: "This email is already registered. Log in or reset your password.",
    EMAIL_ALREADY_REGISTERED: "This email is already registered. The existing account has not been changed. Log in or recover your password.",
    ACCOUNT_CREATED_EMAIL_FAILED: "Your unverified attendee account and terms acceptance were saved, but the verification email could not be sent. Request another verification email, then verify before logging in separately.",
    TERMS_VERSION_OUTDATED: "The terms have changed. Read the current document and explicitly accept it before submitting again.",
    INVALID_RECOVERY_LINK: "This recovery link is invalid. Request a new link.",
    EXPIRED_RECOVERY_LINK: "This recovery link has expired. Request a new link.",
    USED_RECOVERY_LINK: "This recovery link has already been used. Request a new link.",
    RATE_LIMITED: "Too many attempts. Please wait before trying again.",
    UNAVAILABLE: "The account service is unavailable. Please try again.",
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
