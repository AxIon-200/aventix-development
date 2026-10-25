import { createPayMongoWebhookApp } from "../lib/paymongo-webhook.js";

const port = Number(process.env.PAYMONGO_WEBHOOK_PORT ?? 5051);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid webhook port");
createPayMongoWebhookApp().listen(port, "127.0.0.1", () => {
  console.log(`PayMongo test webhook receiver listening on 127.0.0.1:${port}`);
});
