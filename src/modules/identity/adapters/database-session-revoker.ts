import { and, eq, isNull } from "drizzle-orm";
import type { getDatabase } from "@/infrastructure/database/client";
import { sessions } from "@/infrastructure/database/schema";
import type { SessionRevoker } from "../application/ports";

type Database = ReturnType<typeof getDatabase>;

export function createDatabaseSessionRevoker(db: Database): SessionRevoker {
  return {
    async revoke(tokenHash, now) {
      await db
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
    },
  };
}
