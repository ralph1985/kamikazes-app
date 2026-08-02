import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
});

export const serverEnv = serverEnvSchema.parse({ DATABASE_URL: process.env.DATABASE_URL });
