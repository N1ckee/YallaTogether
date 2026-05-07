import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db/client.js";
import jwt from "jsonwebtoken";

const router = Router();

// TEST
router.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "Auth route is working",
    time: new Date().toISOString()
  });
});

// REGISTER
router.post('/register', async (req, res) => {
  const {
    first_name,
    last_name,
    username,
    email,
    phone_number,
    password,
    role,
    user_rating,
    icon_url,
    license_number
  } = req.body;

  const normalizedRole = role === "driver" ? "driver" : "user";

  if (!first_name || !last_name || !username || !email || !password) {
    return res.status(400).json({ error: "Missing required registration fields." });
  }

  if (normalizedRole === "driver" && !license_number) {
    return res.status(400).json({ error: "License number is required for drivers." });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const password_hash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users
        (first_name, last_name, username, email, phone_number, password_hash, role, user_rating, icon_url)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING user_id`,
      [
        first_name,
        last_name,
        username,
        email,
        phone_number || null,
        password_hash,
        normalizedRole,
        user_rating || 0,
        icon_url || null
      ]
    );
    const user_id = userResult.rows[0].user_id;

    if (normalizedRole === "driver") {
      await client.query(
        "INSERT INTO drivers (user_id, driver_rating, license_number) VALUES ($1, $2, $3)",
        [user_id, 0, license_number]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Registration successful." });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error(err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username, email, or license number already exists." });
    }
    res.status(500).json({ error: "Registration failed." });
  } finally {
    client?.release();
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  try {
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Missing login credentials' });
    }

    const result = await pool.query(
      `SELECT user_id, username, email, password_hash, role
       FROM users
       WHERE email = $1 OR username = $1
       LIMIT 1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "JWT_SECRET environment variable is not set" });
    }

    // Generate JWT token after verifying credentials
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.status(200).json({ message: "Login successful" });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: process.env.NODE_ENV === 'development'
        ? (err.message || "Server error")
        : "Server error"
    });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });

  res.json({ message: "Logged out." });
});

export default router;
