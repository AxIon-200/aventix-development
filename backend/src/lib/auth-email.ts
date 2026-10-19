export interface AuthEmailMessage { to: string; url: string }
export type SendAuthEmail = (message: AuthEmailMessage) => Promise<void>;

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export async function deliverAuthEmail(message: { to: string; subject: string; text: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!key || !from) throw new Error("Email provider is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({ ...message, from, to: [message.to] }),
  });
  if (!response.ok) throw new Error("Email provider rejected delivery");
}
