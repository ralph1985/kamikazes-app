import { asc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDatabase } from "@/infrastructure/database/client";
import { accounts, members } from "@/infrastructure/database/schema";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("kamikazes_session")?.value;
  if (!token) return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);

  try {
    const database = getDatabase();
    const actor = await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });
    if (!(await createDatabaseGlobalAdminReader(database).isGlobalAdmin(actor.memberId))) {
      return apiFailure("not_found", "No encontrado", 404);
    }

    const rows = await database
      .select({
        id: members.id,
        displayName: members.displayName,
        username: accounts.username,
        accountActive: accounts.isActive,
        mustChangePassword: accounts.mustChangePassword,
      })
      .from(members)
      .leftJoin(accounts, eq(accounts.memberId, members.id))
      .orderBy(asc(members.displayName));

    return apiSuccess(rows);
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("members_unavailable", "No se han podido consultar los miembros", 503);
  }
}
