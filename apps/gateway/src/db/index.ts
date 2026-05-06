import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import "dotenv/config";

const connectionString = process.env.DATABASE_RUNTIME_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_RUNTIME_URL or DATABASE_URL must be set.");
}

const shouldDisablePrepare =
  process.env.DATABASE_DISABLE_PREPARE === "true" ||
  connectionString.includes("pooler.supabase.com") ||
  connectionString.includes(":6543/");

const client = postgres(connectionString, {
  prepare: !shouldDisablePrepare,
});

export const db = drizzle(client, { schema });
export default db;
