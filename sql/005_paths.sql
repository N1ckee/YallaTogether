CREATE TABLE paths (
  path_id SERIAL PRIMARY KEY,
  driver_id INT NOT NULL,
  car_id INT NOT NULL,
  start_location VARCHAR(255) NOT NULL,
  end_location VARCHAR(255) NOT NULL,
  arival_time TIMESTAMP NOT NULL,
  departure_time TIMESTAMP NOT NULL,
  distance FLOAT NOT NULL,
  estimated_time FLOAT NOT NULL,
  stops JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE CASCADE
);
