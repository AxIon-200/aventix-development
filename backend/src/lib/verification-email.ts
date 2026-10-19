export interface VerificationMessage { to: string; url: string }
export type SendVerificationEmail = (message: VerificationMessage) => Promise<void>;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export const sendVerificationEmail: SendVerificationEmail = async ({ to, url }) => {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!key || !from) throw new Error("Email provider is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({ from, to: [to], subject: "Verify your Aventix email",
      text: `Your Aventix account was created. Open ${url} for email verification instructions. The link expires in 24 hours. Your current password is also required.`,
      html: `<p>Your Aventix account was created.</p><p><a href="${escapeHtml(url)}">Email verification instructions</a></p><p>The link expires in 24 hours. Your current password is also required.</p>` }),
  });
  if (!response.ok) throw new Error("Email provider rejected delivery");
};
