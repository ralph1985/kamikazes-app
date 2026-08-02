import { and, eq, gt, isNull } from "drizzle-orm";
import type { getDatabase } from "@/infrastructure/database/client";
import { accounts, members, sessions } from "@/infrastructure/database/schema";
import type { AuthenticatedMember, SessionReader } from "../application/ports";

type Database = ReturnType<typeof getDatabase>;

export function createDatabaseSessionReader(db: Database): SessionReader {
  return {
    async findActiveMemberByTokenHash(tokenHash, now) {
      const rows = await db
        .select({
          memberId: members.id,
          displayName: members.displayName,
          mustChangePassword: accounts.mustChangePassword,
        })
        .from(sessions)
        .innerJoin(members, eq(sessions.memberId, members.id))
        .innerJoin(accounts, eq(accounts.memberId, members.id))
        .where(
          and(
            eq(sessions.tokenHash, tokenHash),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, now),
            eq(accounts.isActive, true),
          ),
        )
        .limit(1);

      return rows[0] satisfies AuthenticatedMember | undefined;
    },
  };
}
