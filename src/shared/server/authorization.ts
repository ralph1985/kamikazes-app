import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDatabase } from "@/infrastructure/database/client";
import { editions, roleAssignments } from "@/infrastructure/database/schema";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";

export type Database = ReturnType<typeof getDatabase>;
export type AuthenticatedRequest = {
  database: Database;
  member: Awaited<ReturnType<typeof authenticateSession>>;
};
export type EditionArea = "budget" | "shopping" | "catering" | "inventory" | "content";

export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedRequest> {
  const token = request.cookies.get("kamikazes_session")?.value;
  if (!token) throw new IdentityError("invalid_credentials", "La sesión no es válida");
  const database = getDatabase();
  const member = await authenticateSession(token, {
    sessions: createDatabaseSessionReader(database),
    clock: { now: () => new Date() },
  });
  return { database, member };
}

export async function canEditEditionArea(
  database: Database,
  memberId: string,
  editionId: string,
  area: EditionArea,
) {
  if (await createDatabaseGlobalAdminReader(database).isGlobalAdmin(memberId)) return true;
  const rows = await database
    .select({ id: roleAssignments.id })
    .from(roleAssignments)
    .where(
      and(
        eq(roleAssignments.memberId, memberId),
        eq(roleAssignments.editionId, editionId),
        eq(roleAssignments.area, area),
        eq(roleAssignments.role, "editor"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export function isGlobalAdmin(database: Database, memberId: string) {
  return createDatabaseGlobalAdminReader(database).isGlobalAdmin(memberId);
}

export async function assertEditionOpen(database: Database, editionId: string) {
  const rows = await database
    .select({ status: editions.status })
    .from(editions)
    .where(eq(editions.id, editionId))
    .limit(1);
  if (rows.length === 0) throw new Error("edition_not_found");
  if (rows[0].status === "closed") throw new Error("edition_closed");
}

export function isIdentityError(error: unknown): error is IdentityError {
  return error instanceof IdentityError;
}
