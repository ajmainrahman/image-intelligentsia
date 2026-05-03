import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
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
      "Database connection string is missing. Set DATABASE_URL in your Vercel project environment variables (Settings → Environment Variables).",
    );
  }

  return databaseUrl;
}

type NeonDb = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: NeonDb | null = null;

function getDb(): NeonDb {
  if (!dbInstance) {
    const sql = neon(getDatabaseUrl());
    dbInstance = drizzle(sql, { schema });
  }
  return dbInstance;
}

export const db = new Proxy({} as NeonDb, {
  get(_target, property, receiver) {
    return Reflect.get(getDb(), property, receiver);
  },
});

export { sql } from "drizzle-orm";
export * from "./schema";
export * from "./schema/notepad";
