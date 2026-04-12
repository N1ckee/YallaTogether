CREATE TABLE cars (
  car_id SERIAL PRIMARY KEY,
  driver_id INT NOT NULL,
  make VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  year INT NOT NULL,
  color VARCHAR(50),
  passenger_capacity INT NOT NULL,
  license_plate VARCHAR(20) NOT NULL UNIQUE,
  fuel_type VARCHAR(50),
  fuel_efficiency FLOAT,
  FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE CASCADE
);
