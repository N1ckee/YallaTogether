import { Router } from "express";
import { pool } from "../db/client.js";
import verify from "../middleware/verify.js";

const router = Router();

router.get("/get", verify, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM cars WHERE user_id = $1",
      [req.user.user_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/add", verify, async (req, res) => {
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
    const carResult = await pool.query(
      `INSERT INTO cars
      (
        make,
        model,
        year,
        color,
        passenger_capacity,
        license_plate,
        fuel_type,
        fuel_efficiency,
        user_id
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        make,
        model,
        year,
        color,
        passenger_capacity,
        license_plate,
        fuel_type,
        fuel_efficiency,
        req.user.user_id,
      ]
    );

    res.json(carResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;

