import { NextRequest } from "next/server";
import { getDatabase } from "@/infrastructure/database/client";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { IdentityError } from "@/modules/identity/domain/identity";
import { authenticateSession } from "@/modules/identity/application/session";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("kamikazes_session")?.value;

  try {
    const database = getDatabase();
    const member = await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });
    const isAdmin = await createDatabaseGlobalAdminReader(database).isGlobalAdmin(member.memberId);
    return apiSuccess({ ...member, isAdmin });
  } catch (error) {
    if (error instanceof IdentityError) {
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    }
    if (
      error instanceof Error &&
      error.message === "DATABASE_URL must be configured for database operations"
    ) {
      return apiFailure("database_unavailable", "La autenticación no está configurada", 503);
    }
    return apiFailure("authentication_unavailable", "No se ha podido validar la sesión", 503);
  }
}
