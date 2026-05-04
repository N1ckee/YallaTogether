import { Router } from "express";
import { pool } from "../db/client.js";
import jwt from "jsonwebtoken";

const router = Router();

router.get('/get', async (req, res) => {
  try {
    // Ensure user is authenticated and verified
    if (!req.user || !req.user.verified) {
      return res.status(403).json({ error: 'User not verified' });
    }

    // Fetch cars belonging to the authenticated user
    const result = await pool.query(
      'SELECT * FROM cars WHERE user_id = $1',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});


export default router;

