import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_PRISMA_URL;

if (!databaseUrl) {
  throw new Error(
    "Database connection string is missing. Set DATABASE_URL or connect Neon/Postgres so POSTGRES_URL is available.",
  );
}

const isLocalDatabase =
  databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocalDatabase ? undefined : { rejectUnauthorized: false },
  max: process.env.VERCEL ? 1 : undefined,
});

export const db = drizzle(pool, { schema });

export { sql } from "drizzle-orm";
export * from "./schema";
