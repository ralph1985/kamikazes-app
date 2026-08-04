import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { getDatabase } from "@/infrastructure/database/client";
import { auditEvents, editions } from "@/infrastructure/database/schema";
import type { EditionStatusChanger } from "../application/ports";

type Database = ReturnType<typeof getDatabase>;

export function createDatabaseEditionStatusChanger(db: Database): EditionStatusChanger {
  return {
    async change(input) {
      const now = input.now;
      const edition = { id: input.id, year: input.year, status: input.status };
      await db.batch([
        db
          .update(editions)
          .set({ status: input.status, updatedAt: now })
          .where(eq(editions.id, input.id)),
        db.insert(auditEvents).values({
          id: randomUUID(),
          memberId: input.memberId,
          action: "updated",
          area: "editions",
          entity: "edition",
          entityId: input.id,
          beforeValue: { status: input.currentStatus },
          afterValue: { status: input.status },
          createdAt: now,
        }),
      ]);
      return edition;
    },
  };
}
