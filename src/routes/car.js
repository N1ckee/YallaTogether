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

router.post('/add', async (req, res) => {
  const {
    make,
    model,
    year,
    color,
    passenger_capacity,
    license_plate,
    fuel_type,
    fuel_efficiency,
  } = req.body;

  try {
    // Ensure user is authenticated and verified
    if (!req.user || !req.user.verified) {
      return res.status(403).json({ error: 'user not verified' });
    }

    const car_result = await pool.query(
      'INSERT INTO cars (make, model, year, color, passenger_capacity, license_plate, fuel_type, fuel_efficiency, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [make, model, year, color, passenger_capacity, license_plate, fuel_type, fuel_efficiency, req.user.id]
    );
    res.json(car_result.rows[0]);;

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }

});

export default router;

