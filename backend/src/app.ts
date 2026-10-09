import express from "express";

const app = express();

app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Aventix API is running",
  });
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Aventix API running on port ${PORT}`);
});