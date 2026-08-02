import { NextRequest } from "next/server";
import { getDatabase } from "@/infrastructure/database/client";
import { createDatabaseEditionReader } from "@/modules/editions/adapters/database-edition-reader";
import { listEditions } from "@/modules/editions/application/list-editions";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("kamikazes_session")?.value;
  if (!token) {
    return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
  }

  try {
    const database = getDatabase();
    await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });

    return apiSuccess(await listEditions(createDatabaseEditionReader(database)));
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
    return apiFailure("editions_unavailable", "No se han podido consultar las ediciones", 503);
  }
}
