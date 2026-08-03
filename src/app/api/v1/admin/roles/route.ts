import { asc } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDatabase } from "@/infrastructure/database/client";
import { editions } from "@/infrastructure/database/schema";
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
    const availableEditions = await database
      .select({ id: editions.id, year: editions.year, status: editions.status })
      .from(editions)
      .orderBy(asc(editions.year));
    return apiSuccess({
      areas: ["editions", "budget", "shopping", "catering"],
      editions: availableEditions,
    });
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("roles_unavailable", "No se han podido consultar los permisos", 503);
  }
}
