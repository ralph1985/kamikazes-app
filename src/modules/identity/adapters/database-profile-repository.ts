import { eq } from "drizzle-orm";
import type { getDatabase } from "@/infrastructure/database/client";
import { accounts, auditEvents, members } from "@/infrastructure/database/schema";
import type { ProfileReader, ProfileWriter } from "../application/ports";

type Database = ReturnType<typeof getDatabase>;

export function createDatabaseProfileReader(db: Database): ProfileReader {
  return {
    async findByMemberId(memberId) {
      const rows = await db
        .select({
          memberId: members.id,
          displayName: members.displayName,
          username: accounts.username,
        })
        .from(members)
        .innerJoin(accounts, eq(accounts.memberId, members.id))
        .where(eq(members.id, memberId))
        .limit(1);
      return rows[0] ?? null;
    },
  };
}

export function createDatabaseProfileWriter(db: Database): ProfileWriter {
  return {
    async update(input) {
      await db.transaction(async (tx) => {
        if (input.before.displayName !== input.displayName) {
          await tx
            .update(members)
            .set({ displayName: input.displayName, updatedAt: input.now })
            .where(eq(members.id, input.memberId));
          await tx.insert(auditEvents).values({
            memberId: input.memberId,
            action: "update",
            area: "identity",
            entity: "member",
            entityId: input.memberId,
            beforeValue: { displayName: input.before.displayName },
            afterValue: { displayName: input.displayName },
          });
        }
        if (input.before.username !== input.username) {
          await tx
            .update(accounts)
            .set({ username: input.username, updatedAt: input.now })
            .where(eq(accounts.memberId, input.memberId));
          await tx.insert(auditEvents).values({
            memberId: input.memberId,
            action: "update",
            area: "identity",
            entity: "account",
            entityId: input.memberId,
            beforeValue: { username: input.before.username },
            afterValue: { username: input.username },
          });
        }
      });
      return { memberId: input.memberId, displayName: input.displayName, username: input.username };
    },
  };
}
