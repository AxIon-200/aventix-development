import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  console.log(
    `Aventix API running on port ${env.PORT}`
  );
});