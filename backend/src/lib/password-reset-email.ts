import { deliverAuthEmail, escapeHtml } from "./auth-email.js";
import type { SendAuthEmail } from "./auth-email.js";

export const sendPasswordResetEmail: SendAuthEmail = async ({ to, url }) => {
  await deliverAuthEmail({ to, subject: "Reset your Aventix password",
    text: `Open ${url} for password reset instructions. The link expires in 30 minutes. If you did not request this, you can ignore this email.`,
    html: `<p><a href="${escapeHtml(url)}">Password reset instructions</a></p><p>The link expires in 30 minutes. If you did not request this, you can ignore this email.</p>` });
};
