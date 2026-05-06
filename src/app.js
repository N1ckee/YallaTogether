import express from "express";
import cookieParser from "cookie-parser";
import auth_routes from "./routes/auth.js";
import user_routes from "./routes/user.js";
import car_routes from "./routes/car.js";
import path_routes from "./routes/path.js";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");

app.use(express.json());
app.use(cookieParser());
app.use(express.static(publicDir));
app.use("/auth", auth_routes);
app.use("/users", user_routes);
app.use("/cars", car_routes);
app.use("/paths", path_routes);

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "startpage.html"));
});

app.get("/login", (req, res) => res.sendFile(path.join(publicDir, "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(publicDir, "register.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(publicDir, "dashboard.html")));
app.get("/cars-page", (req, res) => res.sendFile(path.join(publicDir, "cars.html")));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

export default app;
