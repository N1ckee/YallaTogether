import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const useSsl =
  process.env.NODE_ENV === "production" ||
  process.env.PGSSLMODE === "require" ||
  process.env.DATABASE_URL?.includes("sslmode=require");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});
