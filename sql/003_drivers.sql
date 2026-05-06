CREATE TABLE drivers (
  driver_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  driver_rating FLOAT DEFAULT  0,
  license_number VARCHAR(50) NOT NULL UNIQUE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
