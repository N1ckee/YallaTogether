import express from "express";
import auth_routes from "./routes/auth.js"
import user_routes from "./routes/user.js"
import car_routes from "./routes/car.js"
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use("/auth", auth_routes);
app.use("/users", user_routes);
app.use("/cars", car_routes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/startpage.html'));
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

export default app;
