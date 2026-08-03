import { and, eq, isNull } from "drizzle-orm";
import type { getDatabase } from "@/infrastructure/database/client";
import { roleAssignments } from "@/infrastructure/database/schema";
import type { GlobalAdminReader } from "../application/ports";

type Database = ReturnType<typeof getDatabase>;

export function createDatabaseGlobalAdminReader(db: Database): GlobalAdminReader {
  return {
    async isGlobalAdmin(memberId) {
      const rows = await db
        .select({ id: roleAssignments.id })
        .from(roleAssignments)
        .where(
          and(
            eq(roleAssignments.memberId, memberId),
            eq(roleAssignments.area, "global"),
            eq(roleAssignments.role, "admin"),
            isNull(roleAssignments.editionId),
          ),
        )
        .limit(1);

      return rows.length > 0;
    },
  };
}
