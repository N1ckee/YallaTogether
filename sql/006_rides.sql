CREATE TABLE rides (
  ride_id SERIAL PRIMARY KEY,
  path_id INT NOT NULL UNIQUE,
  driver_id INT NOT NULL,
  driver_lat FLOAT,
  driver_lng FLOAT,
  eta_total_minutes FLOAT,
  eta_to_destination_minutes FLOAT,
  distance_to_destination_km FLOAT,
  stop_live_data JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'waiting_tostart',
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (path_id) REFERENCES paths(path_id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE CASCADE
);

CREATE INDEX idx_rides_path_id ON rides(path_id);
CREATE INDEX idx_rides_driver_id ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
