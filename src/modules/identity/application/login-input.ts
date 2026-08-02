import { z } from "zod";

export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof loginInputSchema>;
