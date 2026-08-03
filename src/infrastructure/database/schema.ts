import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, money, primaryKey, updatedAt } from "./columns";

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

export const editions = pgTable(
  "editions",
  {
    id: primaryKey(),
    year: integer("year").notNull(),
    status: text("status").notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("editions_year_unique").on(table.year),
    check("editions_status_allowed", sql`${table.status} in ('open', 'closed')`),
  ],
);

export const editionParticipants = pgTable(
  "edition_participants",
  {
    id: primaryKey(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "restrict" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    rateId: uuid("rate_id").references(() => budgetRates.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("edition_participants_edition_member_unique").on(table.editionId, table.memberId),
  ],
);

export const budgetRates = pgTable(
  "budget_rates",
  {
    id: primaryKey(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    amount: money("amount").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("budget_rates_edition_name_unique").on(table.editionId, table.name)],
);

export const roleAssignments = pgTable(
  "role_assignments",
  {
    id: primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    editionId: uuid("edition_id").references(() => editions.id, { onDelete: "restrict" }),
    area: text("area").notNull(),
    role: text("role").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("role_assignments_member_edition_area_unique").on(
      table.memberId,
      table.editionId,
      table.area,
    ),
    check("role_assignments_role_allowed", sql`${table.role} in ('admin', 'editor', 'reader')`),
    check(
      "role_assignments_area_allowed",
      sql`${table.area} in ('global', 'identity', 'editions', 'budget', 'shopping', 'catering', 'public-content', 'audit')`,
    ),
    check(
      "role_assignments_scope_valid",
      sql`(${table.role} = 'admin' and ${table.area} = 'global' and ${table.editionId} is null) or (${table.role} in ('editor', 'reader') and ${table.area} <> 'global' and ${table.editionId} is not null)`,
    ),
  ],
);

export const auditEvents = pgTable("audit_events", {
  id: primaryKey(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "restrict" }),
  action: text("action").notNull(),
  area: text("area").notNull(),
  entity: text("entity").notNull(),
  entityId: uuid("entity_id").notNull(),
  beforeValue: jsonb("before_value"),
  afterValue: jsonb("after_value"),
  createdAt: createdAt(),
});
