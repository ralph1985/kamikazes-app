import { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import { createDatabasePasswordChangeWriter } from "@/modules/identity/adapters/database-password-change-writer";
import { createDatabasePasswordReader } from "@/modules/identity/adapters/database-password-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { argon2PasswordHasher } from "@/modules/identity/adapters/argon2-password-hasher";
import { changePassword } from "@/modules/identity/application/change-password";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

const inputSchema = z.object({ currentPassword: z.string(), newPassword: z.string() });
const SESSION_COOKIE = "kamikazes_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFailure("invalid_request", "El cuerpo debe ser JSON válido", 400);
  }

  const input = inputSchema.safeParse(body);
  if (!input.success) {
    return apiFailure("invalid_request", "currentPassword y newPassword son obligatorios", 400);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);

  try {
    const database = getDatabase();
    const member = await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });
    const session = await changePassword(
      {
        memberId: member.memberId,
        currentToken: token,
        currentPassword: input.data.currentPassword,
        newPassword: input.data.newPassword,
      },
      {
        passwords: argon2PasswordHasher,
        passwordReader: createDatabasePasswordReader(database),
        writer: createDatabasePasswordChangeWriter(database),
        clock: { now: () => new Date() },
      },
    );
    const response = apiSuccess({ changed: true });
    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
      expires: session.expiresAt,
    });
    return response;
  } catch (error) {
    if (error instanceof IdentityError) {
      if (error.code === "invalid_password") {
        return apiFailure("invalid_password", error.message, 400);
      }
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    }
    if (
      error instanceof Error &&
      error.message === "DATABASE_URL must be configured for database operations"
    ) {
      return apiFailure("database_unavailable", "La autenticación no está configurada", 503);
    }
    return apiFailure("authentication_unavailable", "No se ha podido cambiar la contraseña", 503);
  }
}
