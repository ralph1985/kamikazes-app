import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import { createDatabaseEditionCreator } from "@/modules/editions/adapters/database-edition-creator";
import { createDatabaseEditionReader } from "@/modules/editions/adapters/database-edition-reader";
import { createEdition } from "@/modules/editions/application/create-edition";
import { listEditions } from "@/modules/editions/application/list-editions";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";
const createEditionInputSchema = z.object({ year: z.number().int().min(1900).max(2200) });

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

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFailure("invalid_request", "El cuerpo debe ser JSON válido", 400);
  }

  const input = createEditionInputSchema.safeParse(body);
  if (!input.success) {
    return apiFailure("invalid_request", "year debe ser un número entero válido", 400);
  }

  const token = request.cookies.get("kamikazes_session")?.value;
  if (!token) return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);

  try {
    const database = getDatabase();
    const member = await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });
    const isAdmin = await createDatabaseGlobalAdminReader(database).isGlobalAdmin(member.memberId);
    if (!isAdmin)
      return apiFailure("forbidden", "Sólo el administrador puede crear ediciones", 403);

    const edition = await createEdition(
      { id: randomUUID(), year: input.data.year, memberId: member.memberId },
      { creator: createDatabaseEditionCreator(database), clock: { now: () => new Date() } },
    );
    return apiSuccess(edition, 201);
  } catch (error) {
    if (error instanceof IdentityError) {
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    }
    if (isUniqueViolation(error)) {
      return apiFailure("edition_exists", "Ya existe una edición para ese año", 409);
    }
    if (error instanceof Error && error.message === "El año de la edición no es válido") {
      return apiFailure("invalid_request", error.message, 400);
    }
    if (
      error instanceof Error &&
      error.message === "DATABASE_URL must be configured for database operations"
    ) {
      return apiFailure("database_unavailable", "La autenticación no está configurada", 503);
    }
    return apiFailure("editions_unavailable", "No se ha podido crear la edición", 503);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
