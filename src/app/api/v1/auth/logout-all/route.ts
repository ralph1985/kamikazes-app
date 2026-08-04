import { NextRequest } from "next/server";
import { getDatabase } from "@/infrastructure/database/client";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { createDatabaseSessionRevoker } from "@/modules/identity/adapters/database-session-revoker";
import { authenticateSession } from "@/modules/identity/application/session";
import { logoutAll } from "@/modules/identity/application/logout";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const response = apiSuccess({ loggedOut: true });
  const token = request.cookies.get("kamikazes_session")?.value;
  if (!token) return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);

  try {
    const database = getDatabase();
    const member = await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });
    await logoutAll(member.memberId, {
      sessions: createDatabaseSessionRevoker(database),
      clock: { now: () => new Date() },
    });
    response.cookies.set("kamikazes_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    if (
      error instanceof Error &&
      error.message === "DATABASE_URL must be configured for database operations"
    ) {
      return apiFailure("database_unavailable", "La autenticación no está configurada", 503);
    }
    return apiFailure("authentication_unavailable", "No se han podido cerrar las sesiones", 503);
  }
}
