import { asc } from "drizzle-orm";
import type { getDatabase } from "@/infrastructure/database/client";
import { editions } from "@/infrastructure/database/schema";
import type { EditionReader } from "../application/ports";
import type { EditionStatus } from "../domain/edition";

type Database = ReturnType<typeof getDatabase>;

export function createDatabaseEditionReader(db: Database): EditionReader {
  return {
    async list() {
      const rows = await db
        .select({ id: editions.id, year: editions.year, status: editions.status })
        .from(editions)
        .orderBy(asc(editions.year));

      return rows.map((row) => ({
        ...row,
        status: row.status as EditionStatus,
      }));
    },
  };
}
