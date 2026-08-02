import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { requireDatabaseUrl } from "@/infrastructure/config/env";
import * as schema from "./schema";

export function getDatabase() {
  return drizzle(neon(requireDatabaseUrl()), { schema });
}
