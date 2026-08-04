import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import { editions } from "@/infrastructure/database/schema";
import { createDatabaseEditionStatusChanger } from "@/modules/editions/adapters/database-edition-status-changer";
import { changeEditionStatus } from "@/modules/editions/application/change-edition-status";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

const updateStatusSchema = z.object({ status: z.enum(["open", "closed"]) });

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
) {
  const { editionId } = await context.params;
  if (!z.uuid().safeParse(editionId).success)
    return apiFailure("invalid_request", "La edición no es válida", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFailure("invalid_request", "El cuerpo debe ser JSON válido", 400);
  }
  const input = updateStatusSchema.safeParse(body);
  if (!input.success) return apiFailure("invalid_request", "El estado no es válido", 400);

  const token = request.cookies.get("kamikazes_session")?.value;
  if (!token) return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);

  try {
    const database = getDatabase();
    const actor = await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });
    if (!(await createDatabaseGlobalAdminReader(database).isGlobalAdmin(actor.memberId))) {
      return apiFailure("forbidden", "Sólo el administrador puede cambiar el estado", 403);
    }

    const current = await database
      .select({ id: editions.id, year: editions.year, status: editions.status })
      .from(editions)
      .where(and(eq(editions.id, editionId)))
      .limit(1);
    if (current.length === 0) return apiFailure("not_found", "La edición no existe", 404);

    const edition = await changeEditionStatus(
      {
        id: editionId,
        year: current[0].year,
        currentStatus: current[0].status,
        status: input.data.status,
        memberId: actor.memberId,
      },
      {
        changer: createDatabaseEditionStatusChanger(database),
        clock: { now: () => new Date() },
      },
    );
    return apiSuccess(edition);
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("editions_unavailable", "No se ha podido actualizar la edición", 503);
  }
}
