/** Deployment configuration only; incoming Host/forwarding headers cannot select this origin. */
export function authBackendOrigin(): string {
  const url = new URL(process.env.AUTH_BACKEND_URL ?? "http://localhost:5000");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("AUTH_BACKEND_URL must be an HTTP(S) origin without credentials or a path.");
  }
  return url.origin;
}
