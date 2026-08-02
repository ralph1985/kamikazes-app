import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, primaryKey, updatedAt } from "./columns";

export const members = pgTable("members", {
  id: primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedAt: timestamp("locked_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("accounts_member_id_unique").on(table.memberId),
    uniqueIndex("accounts_username_unique").on(table.username),
    check("accounts_failed_login_attempts_nonnegative", sql`${table.failedLoginAttempts} >= 0`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [uniqueIndex("sessions_token_hash_unique").on(table.tokenHash)],
);
