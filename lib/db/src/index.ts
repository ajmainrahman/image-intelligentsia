import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
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

function getDatabaseUrl(): string {
  const databaseUrl =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_PRISMA_URL;

  if (!databaseUrl) {
    throw new DatabaseConfigurationError(
      "Database connection string is missing. Set DATABASE_URL in your environment variables.",
    );
  }

  return databaseUrl;
}

type PgDb = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: PgDb | null = null;

function getDb(): PgDb {
  if (!dbInstance) {
    const pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: getDatabaseUrl().includes("sslmode=require") || getDatabaseUrl().includes("neon.tech")
        ? { rejectUnauthorized: false }
        : false,
    });
    dbInstance = drizzle(pool, { schema });
  }
  return dbInstance;
}

export const db = new Proxy({} as PgDb, {
  get(_target, property, receiver) {
    return Reflect.get(getDb(), property, receiver);
  },
});

export { sql } from "drizzle-orm";
export * from "./schema";
