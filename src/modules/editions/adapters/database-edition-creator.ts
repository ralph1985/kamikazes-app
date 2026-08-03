import { randomUUID } from "node:crypto";
import type { getDatabase } from "@/infrastructure/database/client";
import { auditEvents, editions } from "@/infrastructure/database/schema";
import type { EditionCreator } from "../application/create-edition";
import type { EditionStatus } from "../domain/edition";

type Database = ReturnType<typeof getDatabase>;

export function createDatabaseEditionCreator(db: Database): EditionCreator {
  return {
    async create(input) {
      const edition = {
        id: input.id,
        year: input.year,
        status: "open" as const,
      };

      await db.batch([
        db.insert(editions).values({
          id: edition.id,
          year: edition.year,
          status: edition.status,
          createdAt: input.now,
          updatedAt: input.now,
        }),
        db.insert(auditEvents).values({
          id: randomUUID(),
          memberId: input.memberId,
          action: "created",
          area: "editions",
          entity: "edition",
          entityId: edition.id,
          beforeValue: null,
          afterValue: { year: edition.year, status: edition.status },
          createdAt: input.now,
        }),
      ]);

      return { ...edition, status: edition.status as EditionStatus };
    },
  };
}
