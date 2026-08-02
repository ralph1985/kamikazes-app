import { NextRequest } from "next/server";
import { IdentityError } from "@/modules/identity/domain/identity";
import { createDatabaseAccountRepository } from "@/modules/identity/adapters/database-account-repository";
import { createDatabaseSessionIssuer } from "@/modules/identity/adapters/database-session-issuer";
import { argon2PasswordHasher } from "@/modules/identity/adapters/argon2-password-hasher";
import { login } from "@/modules/identity/application/login";
import { loginInputSchema } from "@/modules/identity/application/login-input";
import { getDatabase } from "@/infrastructure/database/client";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

const SESSION_COOKIE = "kamikazes_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFailure("invalid_request", "El cuerpo debe ser JSON válido", 400);
  }

  const input = loginInputSchema.safeParse(body);
  if (!input.success) {
    return apiFailure("invalid_request", "username y password son obligatorios", 400);
  }

  try {
    const database = getDatabase();
    const result = await login(input.data, {
      accounts: createDatabaseAccountRepository(database),
      passwords: argon2PasswordHasher,
      sessions: createDatabaseSessionIssuer(database),
      clock: { now: () => new Date() },
    });

    const response = apiSuccess({
      memberId: result.memberId,
      mustChangePassword: result.mustChangePassword,
    });
    response.cookies.set(SESSION_COOKIE, result.session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
      expires: result.session.expiresAt,
    });
    return response;
  } catch (error) {
    if (error instanceof IdentityError) {
      if (error.code === "account_locked") {
        return apiFailure("account_locked", "La cuenta está bloqueada", 423);
      }
      return apiFailure("invalid_credentials", "Las credenciales no son válidas", 401);
    }

    if (
      error instanceof Error &&
      error.message === "DATABASE_URL must be configured for database operations"
    ) {
      return apiFailure("database_unavailable", "La autenticación no está configurada", 503);
    }

    return apiFailure("authentication_unavailable", "No se ha podido completar el acceso", 503);
  }
}
