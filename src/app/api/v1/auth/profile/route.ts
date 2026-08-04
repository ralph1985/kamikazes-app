import { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import {
  createDatabaseProfileReader,
  createDatabaseProfileWriter,
} from "@/modules/identity/adapters/database-profile-repository";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { readProfile, updateProfile } from "@/modules/identity/application/profile";
import { IdentityError, normalizeUsername } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

const SESSION_COOKIE = "kamikazes_session";
const profileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  username: z.string().trim().min(1).max(60),
});

async function currentMember(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new IdentityError("invalid_credentials");
  const database = getDatabase();
  const member = await authenticateSession(token, {
    sessions: createDatabaseSessionReader(database),
    clock: { now: () => new Date() },
  });
  return { database, member };
}

export async function GET(request: NextRequest) {
  try {
    const { database, member } = await currentMember(request);
    const profile = await readProfile(member.memberId, {
      profiles: createDatabaseProfileReader(database),
    });
    return profile ? apiSuccess(profile) : apiFailure("not_found", "No encontrado", 404);
  } catch (error) {
    return authFailure(error, "No se ha podido cargar el perfil");
  }
}

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFailure("invalid_request", "El cuerpo debe ser JSON válido", 400);
  }
  const input = profileInputSchema.safeParse(body);
  if (!input.success)
    return apiFailure("invalid_request", "Los datos del perfil no son válidos", 400);
  const username = normalizeUsername(input.data.username);
  if (!/^[a-z0-9]+$/.test(username)) {
    return apiFailure(
      "invalid_request",
      "El nombre de usuario sólo puede contener letras y números",
      400,
    );
  }

  try {
    const { database, member } = await currentMember(request);
    const result = await updateProfile(
      { memberId: member.memberId, displayName: input.data.displayName, username },
      {
        profiles: createDatabaseProfileReader(database),
        writer: createDatabaseProfileWriter(database),
        clock: { now: () => new Date() },
      },
    );
    return apiSuccess(result);
  } catch (error) {
    if (isUniqueViolation(error))
      return apiFailure("username_exists", "Ese nombre de usuario ya está en uso", 409);
    return authFailure(error, "No se ha podido actualizar el perfil");
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function authFailure(error: unknown, fallback: string) {
  if (error instanceof IdentityError)
    return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
  if (
    error instanceof Error &&
    error.message === "DATABASE_URL must be configured for database operations"
  ) {
    return apiFailure("database_unavailable", "La autenticación no está configurada", 503);
  }
  return apiFailure("profile_unavailable", fallback, 503);
}
