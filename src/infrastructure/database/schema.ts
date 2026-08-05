import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  numeric,
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

export const publicSections = pgTable(
  "public_sections",
  {
    id: primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("public_sections_title_unique").on(table.title)],
);

export const publicSocialLinks = pgTable("public_social_links", {
  id: primaryKey(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const budgetTransactions = pgTable(
  "budget_transactions",
  {
    id: primaryKey(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "restrict" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(),
    amount: money("amount").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    method: text("method").notNull(),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("budget_transactions_kind_allowed", sql`${table.kind} in ('payment', 'refund')`),
    check(
      "budget_transactions_method_allowed",
      sql`${table.method} in ('cash', 'bizum', 'transfer')`,
    ),
    check(
      "budget_transactions_amount_sign",
      sql`(${table.kind} = 'payment' and ${table.amount} >= 0) or (${table.kind} = 'refund' and ${table.amount} <= 0)`,
    ),
  ],
);

export const budgetBalances = pgTable("budget_balances", {
  id: primaryKey(),
  editionId: uuid("edition_id")
    .notNull()
    .references(() => editions.id, { onDelete: "restrict" }),
  amount: money("amount").notNull(),
  concept: text("concept").notNull(),
  originYear: integer("origin_year"),
  originEditionId: uuid("origin_edition_id").references(() => editions.id, {
    onDelete: "restrict",
  }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const budgetMovements = pgTable(
  "budget_movements",
  {
    id: primaryKey(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(),
    amount: money("amount").notNull(),
    isPlanned: boolean("is_planned").notNull().default(false),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    concept: text("concept").notNull(),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("budget_movements_kind_allowed", sql`${table.kind} in ('income', 'expense')`),
    check(
      "budget_movements_amount_sign",
      sql`(${table.kind} = 'income' and ${table.amount} >= 0) or (${table.kind} = 'expense' and ${table.amount} <= 0)`,
    ),
  ],
);

export const shoppingCategories = pgTable(
  "shopping_categories",
  {
    id: primaryKey(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("shopping_categories_edition_name_unique").on(table.editionId, table.name),
  ],
);

export const shoppingStores = pgTable(
  "shopping_stores",
  {
    id: primaryKey(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("shopping_stores_edition_name_unique").on(table.editionId, table.name)],
);

export const shoppingProducts = pgTable(
  "shopping_products",
  {
    id: primaryKey(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "restrict" }),
    description: text("description").notNull().default(""),
    categoryId: uuid("category_id").references(() => shoppingCategories.id, {
      onDelete: "restrict",
    }),
    storeId: uuid("store_id").references(() => shoppingStores.id, { onDelete: "restrict" }),
    assignedMemberId: uuid("assigned_member_id").references(() => members.id, {
      onDelete: "restrict",
    }),
    assignment: text("assignment"),
    plannedQuantity: numeric("planned_quantity", { precision: 12, scale: 2 }),
    realQuantity: numeric("real_quantity", { precision: 12, scale: 2 }),
    plannedUnitPrice: money("planned_unit_price"),
    realUnitPrice: money("real_unit_price"),
    notes: text("notes"),
    status: text("status").notNull().default("pending"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "shopping_products_status_allowed",
      sql`${table.status} in ('pending', 'in_cart', 'purchased', 'not_buying', 'gifted')`,
    ),
  ],
);

export const shoppingPurchases = pgTable("shopping_purchases", {
  id: primaryKey(),
  editionId: uuid("edition_id")
    .notNull()
    .references(() => editions.id, { onDelete: "restrict" }),
  storeId: uuid("store_id").references(() => shoppingStores.id, { onDelete: "restrict" }),
  purchaserMemberId: uuid("purchaser_member_id")
    .notNull()
    .references(() => members.id, { onDelete: "restrict" }),
  purchasedAt: timestamp("purchased_at", { withTimezone: true, mode: "date" }).notNull(),
  totalAmount: money("total_amount").notNull(),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const shoppingPreferences = pgTable(
  "shopping_preferences",
  {
    id: primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    groupBy: text("group_by").notNull().default("category"),
    sortBy: text("sort_by").notNull().default("description"),
    sortDirection: text("sort_direction").notNull().default("asc"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("shopping_preferences_member_unique").on(table.memberId),
    check(
      "shopping_preferences_group_allowed",
      sql`${table.groupBy} in ('category', 'store', 'assignment', 'status')`,
    ),
    check(
      "shopping_preferences_sort_allowed",
      sql`${table.sortBy} in ('description', 'unit_price', 'quantity', 'total')`,
    ),
    check("shopping_preferences_direction_allowed", sql`${table.sortDirection} in ('asc', 'desc')`),
  ],
);

export const shoppingEditionPreferences = pgTable(
  "shopping_edition_preferences",
  {
    id: primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "cascade" }),
    query: text("query").notNull().default(""),
    status: text("status"),
    categoryId: uuid("category_id").references(() => shoppingCategories.id, {
      onDelete: "set null",
    }),
    storeId: uuid("store_id").references(() => shoppingStores.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("shopping_edition_preferences_member_edition_unique").on(
      table.memberId,
      table.editionId,
    ),
    check(
      "shopping_edition_preferences_status_allowed",
      sql`${table.status} is null or ${table.status} in ('pending', 'in_cart', 'purchased', 'not_buying', 'gifted')`,
    ),
  ],
);
