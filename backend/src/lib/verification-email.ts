import { deliverAuthEmail, escapeHtml } from "./auth-email.js";
import type { SendAuthEmail } from "./auth-email.js";
export type { AuthEmailMessage as VerificationMessage, SendAuthEmail as SendVerificationEmail } from "./auth-email.js";

export const sendVerificationEmail: SendAuthEmail = async ({ to, url }) => {
  await deliverAuthEmail({ to, subject: "Verify your Aventix email",
    text: `Your Aventix account was created. Open ${url} for email verification instructions. The link expires in 24 hours. Your current password is also required.`,
    html: `<p>Your Aventix account was created.</p><p><a href="${escapeHtml(url)}">Email verification instructions</a></p><p>The link expires in 24 hours. Your current password is also required.</p>` });
};
