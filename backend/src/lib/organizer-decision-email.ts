import { env } from "../config/env.js";
import { deliverAuthEmail, escapeHtml } from "./auth-email.js";

export type OrganizerDecisionKind = "APPROVED" | "REJECTED" | "SUSPENDED" | "REINSTATED";
export interface OrganizerDecisionMessage {
  to: string;
  kind: OrganizerDecisionKind;
  reason?: string;
}
export type SendOrganizerDecisionEmail = (message: OrganizerDecisionMessage) => Promise<void>;

export const sendOrganizerDecisionEmail: SendOrganizerDecisionEmail = async ({ to, kind, reason }) => {
  const login = new URL("/login", env.FRONTEND_URL).href;
  const subject = kind === "APPROVED" ? "Your Aventix organization was approved"
    : kind === "REJECTED" ? "Your Aventix organization application was rejected"
      : kind === "SUSPENDED" ? "Your Aventix organization access was suspended"
        : "Your Aventix organization access was reinstated";
  const message = kind === "APPROVED"
    ? "Your organization was approved. Log in with the password you created when applying."
    : kind === "REJECTED"
      ? `Your organization application was rejected. This decision is final for this account; it cannot be revised or submitted again with this email. Reason: ${reason}`
      : kind === "SUSPENDED"
        ? `Your organization access was suspended. Your existing sessions were ended. Reason: ${reason}`
        : "Your organization access was reinstated. Your previous sessions remain ended; log in again with your existing password.";
  await deliverAuthEmail({ to, subject,
    text: `${message}\n\nEmail verification and organization approval are separate. ${login}`,
    html: `<p>${escapeHtml(message)}</p><p>Email verification and organization approval are separate.</p><p><a href="${escapeHtml(login)}">Log in to Aventix</a></p>` });
};
