console.log("APP.JS LOADED");


import express from "express";
// import authRoutes from "./routes/auth.routes.js";
// import usersRoutes from "./routes/users.routes.js";
// import { notFound } from "./middleware/notFound.js";
// import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// app.use("/api/auth", authRoutes);
// app.use("/api/users", usersRoutes);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// app.use(notFound);
// app.use(errorHandler);

export default app;
