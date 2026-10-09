import express from "express";
import { env } from "./config/env.js";

const app = express();

app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Aventix API is running",
  });
});

app.listen(env.PORT, () => {
  console.log(`Aventix API running on port ${env.PORT}`);
});