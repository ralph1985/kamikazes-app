import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/database/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
