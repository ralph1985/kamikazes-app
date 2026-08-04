import { randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { getDatabase } from "@/infrastructure/database/client";
import { accounts, auditEvents, sessions } from "@/infrastructure/database/schema";
import type { PasswordChangeWriter } from "../application/ports";

type Database = ReturnType<typeof getDatabase>;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createDatabasePasswordChangeWriter(db: Database): PasswordChangeWriter {
  return {
    async changePasswordAndRotateSession(input) {
      const token = randomBytes(32).toString("base64url");

      await db.batch([
        db
          .update(accounts)
          .set({
            passwordHash: input.passwordHash,
            mustChangePassword: false,
            updatedAt: input.now,
          })
          .where(eq(accounts.memberId, input.memberId)),
        db
          .update(sessions)
          .set({ revokedAt: input.now })
          .where(eq(sessions.memberId, input.memberId)),
        db.insert(sessions).values({
          memberId: input.memberId,
          tokenHash: hashToken(token),
          expiresAt: input.expiresAt,
          createdAt: input.now,
          lastSeenAt: input.now,
        }),
        db.insert(auditEvents).values({
          memberId: input.memberId,
          action: "change_password",
          area: "identity",
          entity: "account",
          entityId: input.memberId,
          beforeValue: { passwordSet: true },
          afterValue: { passwordSet: true },
        }),
      ]);

      return { token, expiresAt: input.expiresAt };
    },
  };
}
