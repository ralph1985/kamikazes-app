import { createHash, randomBytes } from "node:crypto";
import type { getDatabase } from "@/infrastructure/database/client";
import { sessions } from "@/infrastructure/database/schema";
import type { SessionIssuer } from "../application/ports";

type Database = ReturnType<typeof getDatabase>;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createDatabaseSessionIssuer(db: Database): SessionIssuer {
  return {
    async issue(memberId, now, expiresAt) {
      const token = randomBytes(32).toString("base64url");
      await db.insert(sessions).values({
        memberId,
        tokenHash: hashToken(token),
        expiresAt,
        createdAt: now,
        lastSeenAt: now,
      });
      return { token, expiresAt };
    },
  };
}
