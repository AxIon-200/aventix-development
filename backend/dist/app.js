import express from "express";
import apiRouter from "./routes/index.js";
const app = express();
app.use(express.json());
app.use("/api/v1", apiRouter);
export default app;
//# sourceMappingURL=app.js.map