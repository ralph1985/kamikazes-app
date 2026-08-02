import { pgTable, uuid } from "drizzle-orm/pg-core";

// Hito 0: schema intentionally starts empty. Domain migrations are introduced
// with their corresponding hito and reviewed before execution against Neon.
export const schemaSentinel = pgTable("schema_sentinel", {
  id: uuid("id").defaultRandom().primaryKey(),
});
