import { readFile, writeFile, mkdir } from "node:fs/promises";

const secretKey = process.env.PAYMONGO_SECRET_KEY;
if (!secretKey?.startsWith("sk_test_")) throw new Error("Configure PAYMONGO_SECRET_KEY with a secret test key");
const endpoint = new URL(process.argv[2] ?? "");
if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash
  || endpoint.pathname !== "/api/v1/webhooks/paymongo") throw new Error("Expected the public HTTPS PayMongo webhook URL");
const statePath = ".local/paymongo/registration.json";
let previousId: string | undefined;
try { previousId = JSON.parse(await readFile(statePath, "utf8")).id; } catch { /* First registration. */ }
if (previousId && !/^hook_[a-zA-Z0-9]+$/.test(previousId)) throw new Error("Invalid local webhook registration ID");
const authorization = "Basic " + Buffer.from(secretKey + ":").toString("base64");
const body = { data: { attributes: { url: endpoint.href, events: ["checkout_session.payment.paid"] } } };
const response = await fetch("https://api.paymongo.com/v1/webhooks" + (previousId ? "/" + previousId : ""), {
  method: previousId ? "PUT" : "POST", headers: { Authorization: authorization, "Content-Type": "application/json" },
  body: JSON.stringify(body), signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(`PayMongo webhook registration failed (HTTP ${response.status})`);
const result = await response.json() as { data: { id: string; attributes: { secret_key?: string; livemode?: boolean; status?: string } } };
if (result.data.attributes.livemode === true) throw new Error("Refusing a live webhook");
let envText = await readFile(".env.test", "utf8");
const values: Record<string, string> = { PAYMONGO_WEBHOOK_ID: result.data.id, PAYMONGO_WEBHOOK_URL: endpoint.href };
if (result.data.attributes.secret_key) values.PAYMONGO_WEBHOOK_SECRET = result.data.attributes.secret_key;
else if (!process.env.PAYMONGO_WEBHOOK_SECRET) throw new Error("PayMongo did not return a signing secret");
for (const [key, value] of Object.entries(values)) {
  const line = key + "=" + JSON.stringify(value);
  const existing = new RegExp("^" + key + "=.*$", "m");
  envText = existing.test(envText) ? envText.replace(existing, () => line) : envText.trimEnd() + "\n" + line + "\n";
}
await writeFile(".env.test", envText);
await mkdir(".local/paymongo", { recursive: true });
await writeFile(statePath, JSON.stringify({ id: result.data.id, url: endpoint.href, status: result.data.attributes.status }, null, 2));
console.log(JSON.stringify({ registered: true, mode: "test", url: endpoint.href, signingSecretSavedLocally: true }));
