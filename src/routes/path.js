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

router.post("/create", verify, async (req, res) => {
  const {
    car_id,
    start_location,
    end_location,
    arrival_time,
    departure_time,
    distance,
    estimated_time,
    stops
  } = req.body;

  if (
    !car_id ||
    !start_location ||
    !end_location ||
    !arrival_time ||
    !departure_time ||
    !distance ||
    !estimated_time
  ) {
    return res.status(400).json({ error: "Missing required ride fields." });
  }

  try {
    const driverId = await getDriverId(req.user.user_id);

    if (!driverId) {
      return res.status(403).json({ error: "Only registered drivers can create rides." });
    }

    const carResult = await pool.query(
      "SELECT car_id FROM cars WHERE car_id = $1 AND driver_id = $2",
      [car_id, driverId]
    );

    if (carResult.rows.length === 0) {
      return res.status(400).json({ error: "Selected car does not belong to this driver." });
    }

    const normalizedStops = Array.isArray(stops)
      ? stops
      : String(stops || "")
        .split("\n")
        .map((stop) => stop.trim())
        .filter(Boolean);

    const result = await pool.query(
      `INSERT INTO paths
        (
          driver_id,
          car_id,
          start_location,
          end_location,
          arrival_time,
          departure_time,
          distance,
          estimated_time,
          stops
        )
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        driverId,
        car_id,
        start_location,
        end_location,
        arrival_time,
        departure_time,
        distance,
        estimated_time,
        JSON.stringify(normalizedStops)
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create ride." });
  }
});

export default router;
