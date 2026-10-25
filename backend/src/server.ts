import app from "./app.js";
import { env } from "./config/env.js";
import { startBookingExpiryWorker } from "./lib/checkout-bookings.js";

startBookingExpiryWorker();

app.listen(env.PORT, () => {
  console.log(
    `Aventix API running on port ${env.PORT}`
  );
});
