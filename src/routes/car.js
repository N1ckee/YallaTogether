import { Router } from "express";
import { pool } from "../db/client.js";
import verify from "../middleware/verify.js";

const router = Router();

async function getDriverId(userId) {
  const result = await pool.query(
    "SELECT driver_id FROM drivers WHERE user_id = $1",
    [userId]
  );

  return result.rows[0]?.driver_id;
}

router.get("/get", verify, async (req, res) => {
  try {
    const driverId = await getDriverId(req.user.user_id);

    if (!driverId) {
      return res.status(403).json({ error: "Only registered drivers can manage cars" });
    }

    const result = await pool.query(
      "SELECT * FROM cars WHERE driver_id = $1 ORDER BY car_id",
      [driverId]
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
    const driverId = await getDriverId(req.user.user_id);

    if (!driverId) {
      return res.status(403).json({ error: "Only registered drivers can add cars" });
    }

    const carResult = await pool.query(
      `INSERT INTO cars
      (
        driver_id,
        make,
        model,
        year,
        color,
        passenger_capacity,
        license_plate,
        fuel_type,
        fuel_efficiency
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        driverId,
        make,
        model,
        year,
        color,
        passenger_capacity,
        license_plate,
        fuel_type,
        fuel_efficiency,
      ]
    );

    res.json(carResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
