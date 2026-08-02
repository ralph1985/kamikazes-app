import { numeric, timestamp, uuid } from "drizzle-orm/pg-core";

export const primaryKey = () => uuid("id").defaultRandom().primaryKey();

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();

export const money = (name: string) => numeric(name, { precision: 12, scale: 2 });
