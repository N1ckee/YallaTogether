import express from "express";
import authRoutes from "./routes/auth.js"

const app = express();

app.use(express.json());
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.redircet("../public/index.html");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

export default app;
