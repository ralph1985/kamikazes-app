import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
});

export const serverEnv = serverEnvSchema.parse({ DATABASE_URL: process.env.DATABASE_URL });

export function requireDatabaseUrl() {
  if (!serverEnv.DATABASE_URL) {
    throw new Error("DATABASE_URL must be configured for database operations");
  }

  return serverEnv.DATABASE_URL;
}
