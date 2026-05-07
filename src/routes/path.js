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
    available_seats,
    start_lat,
    start_lng,
    end_lat,
    end_lng,
    path_data
  } = req.body;

  const requiredFields = [
    car_id,
    start_location,
    end_location,
    arrival_time,
    departure_time,
    distance,
    estimated_time,
    available_seats,
    start_lat,
    start_lng,
    end_lat,
    end_lng,
    path_data
  ];

  if (requiredFields.some((field) => field === undefined || field === null || field === "")) {
    return res.status(400).json({ error: "Missing required ride fields." });
  }

  if (!Array.isArray(path_data) || path_data.length === 0) {
    return res.status(400).json({ error: "Route path data is required." });
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
          available_seats,
          start_lat,
          start_lng,
          end_lat,
          end_lng,
          path_data,
          stops
        )
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
        available_seats,
        start_lat,
        start_lng,
        end_lat,
        end_lng,
        JSON.stringify(path_data),
        JSON.stringify([])
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create ride." });
  }
});

router.get("/all", verify, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        p.path_id,
        p.driver_id,
        p.car_id,
        p.start_location,
        p.end_location,
        p.arrival_time,
        p.departure_time,
        p.distance,
        p.estimated_time,
        p.available_seats,
        p.start_lat,
        p.start_lng,
        p.end_lat,
        p.end_lng,
        p.path_data,
        p.stops,
        p.passanges,
        u.username AS driver_username,
        c.make,
        c.model,
        c.license_plate
       FROM paths p
       JOIN drivers d ON d.driver_id = p.driver_id
       JOIN users u ON u.user_id = d.user_id
       JOIN cars c ON c.car_id = p.car_id
       ORDER BY p.departure_time ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load rides." });
  }
});

router.post("/:pathId/book", verify, async (req, res) => {
  const pathId = Number(req.params.pathId);
  const { lat, lng, label } = req.body;

  if (!Number.isInteger(pathId) || pathId <= 0) {
    return res.status(400).json({ error: "Invalid ride id." });
  }

  if (lat === undefined || lng === undefined || lat === "" || lng === "") {
    return res.status(400).json({ error: "Select your location before booking." });
  }

  const stopLat = Number(lat);
  const stopLng = Number(lng);

  if (!Number.isFinite(stopLat) || !Number.isFinite(stopLng)) {
    return res.status(400).json({ error: "Selected location is invalid." });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const pathResult = await client.query(
      `SELECT path_id, available_seats, stops, passanges
       FROM paths
       WHERE path_id = $1
       FOR UPDATE`,
      [pathId]
    );

    if (pathResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Ride not found." });
    }

    const ride = pathResult.rows[0];

    if (ride.available_seats <= 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "No seats are available for this ride." });
    }

    const passanges = Array.isArray(ride.passanges) ? ride.passanges : [];

    if (passanges.some((passenger) => passenger.user_id === req.user.user_id)) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "You have already booked this ride." });
    }

    const stops = Array.isArray(ride.stops) ? ride.stops : [];
    const bookedAt = new Date().toISOString();

    const stop = {
      user_id: req.user.user_id,
      username: req.user.username,
      lat: stopLat,
      lng: stopLng,
      label: label || "",
      booked_at: bookedAt
    };

    const passenger = {
      user_id: req.user.user_id,
      username: req.user.username,
      stop: {
        lat: stopLat,
        lng: stopLng,
        label: label || ""
      },
      booked_at: bookedAt
    };

    const updatedResult = await client.query(
      `UPDATE paths
       SET
        available_seats = available_seats - 1,
        stops = $1::jsonb,
        passanges = $2::jsonb
       WHERE path_id = $3
       RETURNING *`,
      [
        JSON.stringify([...stops, stop]),
        JSON.stringify([...passanges, passenger]),
        pathId
      ]
    );

    await client.query("COMMIT");
    res.json(updatedResult.rows[0]);
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error(err);
    res.status(500).json({ error: "Could not book ride." });
  } finally {
    client?.release();
  }
});

export default router;
