import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

class DatabaseConfigurationError extends Error {
  statusCode = 500;
  publicMessage: string;

  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
    this.publicMessage = message;
  }
}

let dbInstance: NodePgDatabase<typeof schema> | null = null;

function getDatabaseUrl(): string {
  const databaseUrl =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_PRISMA_URL;

  if (!databaseUrl) {
    throw new DatabaseConfigurationError(
      "Database connection string is missing. Set DATABASE_URL or connect Neon/Postgres so POSTGRES_URL is available.",
    );
  }

  return databaseUrl;
}

function createDb(): NodePgDatabase<typeof schema> {
  const databaseUrl = getDatabaseUrl();
  const isLocalDatabase =
    databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isLocalDatabase ? undefined : { rejectUnauthorized: false },
    max: process.env.VERCEL ? 1 : undefined,
  });

  return drizzle(pool, { schema });
}

function getDb(): NodePgDatabase<typeof schema> {
  dbInstance ??= createDb();
  return dbInstance;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, property, receiver) {
    return Reflect.get(getDb(), property, receiver);
  },
});

export { sql } from "drizzle-orm";
export * from "./schema";
