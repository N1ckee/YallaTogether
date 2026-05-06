import { Router } from "express";
import verify from "../middleware/verify.js";
import path from "path";
import jwt from "jsonwebtoken";
import { pool } from "../db/client.js";

const router = Router();
const publicDir = path.join(process.cwd(), "public");

router.get("/showpage", verify, async (req, res) => {
  res.sendFile(path.join(publicDir, "dashboard.html"));
});

router.post("/become-driver", verify, async (req, res) => {
  const { license_number } = req.body;

  if (!license_number) {
    return res.status(400).json({ error: "License number is required." });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "JWT_SECRET environment variable is not set" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const existingDriver = await client.query(
      "SELECT driver_id FROM drivers WHERE user_id = $1",
      [req.user.user_id]
    );

    if (existingDriver.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "This account is already registered as a driver." });
    }

    await client.query(
      "INSERT INTO drivers (user_id, driver_rating, license_number) VALUES ($1, $2, $3)",
      [req.user.user_id, 0, license_number]
    );

    await client.query(
      "UPDATE users SET role = $1 WHERE user_id = $2",
      ["driver", req.user.user_id]
    );

    await client.query("COMMIT");

    const token = jwt.sign(
      {
        user_id: req.user.user_id,
        username: req.user.username,
        role: "driver"
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ message: "Driver registration successful." });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error(err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "License number already exists." });
    }
    res.status(500).json({ error: "Could not register as driver." });
  } finally {
    client?.release();
  }
});


export default router;
