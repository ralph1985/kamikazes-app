import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
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
      const statements: BatchItem<"pg">[] = [];
      if (input.before.displayName !== input.displayName) {
        statements.push(
          db
            .update(members)
            .set({ displayName: input.displayName, updatedAt: input.now })
            .where(eq(members.id, input.memberId)),
          db.insert(auditEvents).values({
            memberId: input.memberId,
            action: "update",
            area: "identity",
            entity: "member",
            entityId: input.memberId,
            beforeValue: { displayName: input.before.displayName },
            afterValue: { displayName: input.displayName },
          }),
        );
      }
      if (input.before.username !== input.username) {
        statements.push(
          db
            .update(accounts)
            .set({ username: input.username, updatedAt: input.now })
            .where(eq(accounts.memberId, input.memberId)),
          db.insert(auditEvents).values({
            memberId: input.memberId,
            action: "update",
            area: "identity",
            entity: "account",
            entityId: input.memberId,
            beforeValue: { username: input.before.username },
            afterValue: { username: input.username },
          }),
        );
      }
      if (statements.length > 0) {
        await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
      }
      return { memberId: input.memberId, displayName: input.displayName, username: input.username };
    },
  };
}
