import { eq } from "drizzle-orm";
import type { getDatabase } from "@/infrastructure/database/client";
import { accounts } from "@/infrastructure/database/schema";
import type { PasswordReader } from "../application/ports";

type Database = ReturnType<typeof getDatabase>;

export function createDatabasePasswordReader(db: Database): PasswordReader {
  return {
    async findHashByMemberId(memberId) {
      const rows = await db
        .select({ passwordHash: accounts.passwordHash })
        .from(accounts)
        .where(eq(accounts.memberId, memberId))
        .limit(1);
      return rows[0]?.passwordHash ?? null;
    },
  };
}
