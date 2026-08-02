import { eq, sql } from "drizzle-orm";
import type { getDatabase } from "@/infrastructure/database/client";
import { accounts } from "@/infrastructure/database/schema";
import type { AccountRepository, IdentityAccount } from "../application/ports";

type Database = ReturnType<typeof getDatabase>;

function toIdentityAccount(row: typeof accounts.$inferSelect): IdentityAccount {
  return {
    accountId: row.id,
    memberId: row.memberId,
    username: row.username,
    passwordHash: row.passwordHash,
    isActive: row.isActive,
    mustChangePassword: row.mustChangePassword,
    failedLoginAttempts: row.failedLoginAttempts,
    lockedAt: row.lockedAt,
  };
}

export function createDatabaseAccountRepository(db: Database): AccountRepository {
  return {
    async findByUsername(username) {
      const rows = await db.select().from(accounts).where(eq(accounts.username, username)).limit(1);
      return rows[0] ? toIdentityAccount(rows[0]) : null;
    },
    async recordFailedLogin(account, lockedAt) {
      await db
        .update(accounts)
        .set({
          failedLoginAttempts: sql`${accounts.failedLoginAttempts} + 1`,
          lockedAt,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, account.accountId));
    },
    async resetFailedLogins(account) {
      await db
        .update(accounts)
        .set({ failedLoginAttempts: 0, lockedAt: null, updatedAt: new Date() })
        .where(eq(accounts.id, account.accountId));
    },
  };
}
