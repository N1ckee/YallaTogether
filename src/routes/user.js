import { Router } from "express";
import { pool } from "../db/client.js";
import jwt from "jsonwebtoken";

const router = Router();

router.get("/showpage", async (req, res) => {
  if (!req.user || !req.user.verified) {
    res.sendFile("../../public/login.html", { root: process.cwd() });
  }
});


export default router;
