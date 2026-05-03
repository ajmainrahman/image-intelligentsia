import { defineConfig } from "drizzle-kit";
import path from "path";

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_PRISMA_URL;

if (!databaseUrl) {
  throw new Error("Database connection string is missing. Set DATABASE_URL in environment variables.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
