import { NextRequest } from "next/server";
import { getDatabase } from "@/infrastructure/database/client";
import { createDatabaseSessionRevoker } from "@/modules/identity/adapters/database-session-revoker";
import { logout } from "@/modules/identity/application/logout";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

const SESSION_COOKIE = "kamikazes_session";

export async function POST(request: NextRequest) {
  const response = apiSuccess({ loggedOut: true });
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  try {
    if (token) {
      await logout(token, {
        sessions: createDatabaseSessionRevoker(getDatabase()),
        clock: { now: () => new Date() },
      });
    }
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "DATABASE_URL must be configured for database operations"
    ) {
      return apiFailure("database_unavailable", "La autenticación no está configurada", 503);
    }
    return apiFailure("authentication_unavailable", "No se ha podido cerrar la sesión", 503);
  }
}
