import express from "express";
import authRoutes from "./routes/auth.js"
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use("/auth", authRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/startpage.html'));
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

export default app;
