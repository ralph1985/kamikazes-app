import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import {
  auditEvents,
  editionParticipants,
  editions,
  roleAssignments,
} from "@/infrastructure/database/schema";
import { createDatabaseEditionParticipantReader } from "@/modules/participation/adapters/database-edition-participant-reader";
import { listEditionParticipants } from "@/modules/participation/application/list-edition-participants";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

const updateInputSchema = z.object({
  memberId: z.uuid(),
  participating: z.boolean(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
) {
  const token = request.cookies.get("kamikazes_session")?.value;
  if (!token) return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);

  try {
    const database = getDatabase();
    await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });
    const { editionId } = await context.params;
    return apiSuccess(
      await listEditionParticipants(editionId, createDatabaseEditionParticipantReader(database)),
    );
  } catch (error) {
    if (error instanceof IdentityError) {
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    }
    return apiFailure(
      "participants_unavailable",
      "No se han podido consultar los participantes",
      503,
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFailure("invalid_request", "El cuerpo debe ser JSON válido", 400);
  }
  const input = updateInputSchema.safeParse(body);
  if (!input.success)
    return apiFailure("invalid_request", "Los datos del participante no son válidos", 400);

  const token = request.cookies.get("kamikazes_session")?.value;
  if (!token) return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);

  try {
    const database = getDatabase();
    const actor = await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });
    const { editionId } = await context.params;
    const isAdmin = await createDatabaseGlobalAdminReader(database).isGlobalAdmin(actor.memberId);
    const editor = await database
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.memberId, actor.memberId),
          eq(roleAssignments.editionId, editionId),
          eq(roleAssignments.area, "editions"),
          eq(roleAssignments.role, "editor"),
        ),
      )
      .limit(1);
    if (!isAdmin && editor.length === 0) {
      return apiFailure("forbidden", "No tienes permiso para editar participantes", 403);
    }

    const result = await database.transaction(async (tx) => {
      const edition = await tx
        .select({ status: editions.status })
        .from(editions)
        .where(eq(editions.id, editionId))
        .limit(1);
      if (edition.length === 0) throw new Error("edition_not_found");
      if (edition[0].status === "closed") throw new Error("edition_closed");

      const before = await tx
        .select({ id: editionParticipants.id })
        .from(editionParticipants)
        .where(
          and(
            eq(editionParticipants.editionId, editionId),
            eq(editionParticipants.memberId, input.data.memberId),
          ),
        )
        .limit(1);
      if (input.data.participating && before.length === 0) {
        await tx.insert(editionParticipants).values({
          editionId,
          memberId: input.data.memberId,
        });
      } else if (!input.data.participating && before.length > 0) {
        await tx.delete(editionParticipants).where(eq(editionParticipants.id, before[0].id));
      }
      await tx.insert(auditEvents).values({
        memberId: actor.memberId,
        action: "update",
        area: "editions",
        entity: "edition_participant",
        entityId: input.data.memberId,
        beforeValue: { participating: before.length > 0 },
        afterValue: { participating: input.data.participating, editionId },
      });
      return { participating: input.data.participating };
    });
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    if (error instanceof Error && error.message === "edition_not_found") {
      return apiFailure("not_found", "La edición no existe", 404);
    }
    if (error instanceof Error && error.message === "edition_closed") {
      return apiFailure("edition_closed", "La edición está cerrada", 409);
    }
    return apiFailure(
      "participants_unavailable",
      "No se ha podido actualizar el participante",
      503,
    );
  }
}
