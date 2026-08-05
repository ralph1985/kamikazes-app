import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import {
  auditEvents,
  budgetMovements,
  editions,
  roleAssignments,
} from "@/infrastructure/database/schema";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

const movementSchema = z.object({
  kind: z.enum(["income", "expense"]),
  amount: z.number().finite().positive().max(9999999999.99),
  isPlanned: z.boolean(),
  occurredAt: z.coerce.date(),
  concept: z.string().trim().min(1).max(240),
  notes: z.string().trim().max(1000).nullable(),
});

async function authenticate(request: NextRequest) {
  const token = request.cookies.get("kamikazes_session")?.value;
  if (!token) throw new IdentityError("invalid_credentials", "La sesión no es válida");
  const database = getDatabase();
  const member = await authenticateSession(token, {
    sessions: createDatabaseSessionReader(database),
    clock: { now: () => new Date() },
  });
  return { database, member };
}

async function canEdit(
  database: ReturnType<typeof getDatabase>,
  memberId: string,
  editionId: string,
) {
  if (await createDatabaseGlobalAdminReader(database).isGlobalAdmin(memberId)) return true;
  const rows = await database
    .select({ id: roleAssignments.id })
    .from(roleAssignments)
    .where(
      and(
        eq(roleAssignments.memberId, memberId),
        eq(roleAssignments.editionId, editionId),
        eq(roleAssignments.area, "budget"),
        eq(roleAssignments.role, "editor"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function openEdition(database: ReturnType<typeof getDatabase>, editionId: string) {
  const rows = await database
    .select({ status: editions.status })
    .from(editions)
    .where(eq(editions.id, editionId))
    .limit(1);
  if (rows.length === 0) throw new Error("edition_not_found");
  if (rows[0].status === "closed") throw new Error("edition_closed");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
) {
  const { editionId } = await context.params;
  if (!z.uuid().safeParse(editionId).success)
    return apiFailure("invalid_request", "La edición no es válida", 400);
  try {
    const { database } = await authenticate(request);
    const movements = await database
      .select()
      .from(budgetMovements)
      .where(eq(budgetMovements.editionId, editionId))
      .orderBy(desc(budgetMovements.occurredAt));
    return apiSuccess({ movements });
  } catch (error) {
    return error instanceof IdentityError
      ? apiFailure("unauthenticated", "Necesitas iniciar sesión", 401)
      : apiFailure("budget_unavailable", "No se han podido consultar los movimientos", 503);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
) {
  return mutate(request, context, null);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
) {
  const body = await json(request);
  if (!body.success) return body.response;
  const id = z.object({ id: z.uuid() }).safeParse(body.value);
  if (!id.success) return apiFailure("invalid_request", "El movimiento no es válido", 400);
  return mutate(request, context, id.data.id, body.value);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
) {
  const { editionId } = await context.params;
  const body = await json(request);
  if (!body.success) return body.response;
  const input = z.object({ id: z.uuid() }).safeParse(body.value);
  if (!input.success) return apiFailure("invalid_request", "El movimiento no es válido", 400);
  try {
    const { database, member } = await authenticate(request);
    if (!(await canEdit(database, member.memberId, editionId)))
      return apiFailure("forbidden", "No tienes permiso para editar el presupuesto", 403);
    await openEdition(database, editionId);
    const current = await database
      .select()
      .from(budgetMovements)
      .where(and(eq(budgetMovements.id, input.data.id), eq(budgetMovements.editionId, editionId)))
      .limit(1);
    if (current.length === 0) return apiFailure("not_found", "El movimiento no existe", 404);
    await database.batch([
      database.delete(budgetMovements).where(eq(budgetMovements.id, input.data.id)),
      database.insert(auditEvents).values({
        id: randomUUID(),
        memberId: member.memberId,
        action: "deleted",
        area: "budget",
        entity: "budget_movement",
        entityId: input.data.id,
        beforeValue: current[0],
        afterValue: null,
      }),
    ]);
    return apiSuccess({ id: input.data.id });
  } catch (error) {
    return handleError(error);
  }
}

async function mutate(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
  id: string | null,
  bodyValue?: unknown,
) {
  const { editionId } = await context.params;
  const body =
    bodyValue === undefined ? await json(request) : { success: true as const, value: bodyValue };
  if (!body.success) return body.response;
  const input = movementSchema.safeParse(body.value);
  if (!input.success) return apiFailure("invalid_request", "El movimiento no es válido", 400);
  try {
    const { database, member } = await authenticate(request);
    if (!(await canEdit(database, member.memberId, editionId)))
      return apiFailure("forbidden", "No tienes permiso para editar el presupuesto", 403);
    await openEdition(database, editionId);
    const movementId = id ?? randomUUID();
    let before: unknown = null;
    if (id) {
      const current = await database
        .select()
        .from(budgetMovements)
        .where(and(eq(budgetMovements.id, id), eq(budgetMovements.editionId, editionId)))
        .limit(1);
      if (current.length === 0) return apiFailure("not_found", "El movimiento no existe", 404);
      before = current[0];
    }
    const values = {
      editionId,
      kind: input.data.kind,
      amount: (input.data.kind === "expense" ? -input.data.amount : input.data.amount).toFixed(2),
      isPlanned: input.data.isPlanned,
      occurredAt: input.data.occurredAt,
      concept: input.data.concept,
      notes: input.data.notes,
      updatedAt: new Date(),
    };
    const mutation = id
      ? database.update(budgetMovements).set(values).where(eq(budgetMovements.id, id))
      : database.insert(budgetMovements).values({ id: movementId, ...values });
    await database.batch([
      mutation,
      database.insert(auditEvents).values({
        id: randomUUID(),
        memberId: member.memberId,
        action: id ? "updated" : "created",
        area: "budget",
        entity: "budget_movement",
        entityId: movementId,
        beforeValue: before,
        afterValue: values,
      }),
    ]);
    return apiSuccess({ id: movementId, ...values }, id ? 200 : 201);
  } catch (error) {
    return handleError(error);
  }
}

async function json(request: NextRequest) {
  try {
    return { success: true as const, value: await request.json() };
  } catch {
    return {
      success: false as const,
      response: apiFailure("invalid_request", "El cuerpo debe ser JSON válido", 400),
    };
  }
}

function handleError(error: unknown) {
  if (error instanceof IdentityError)
    return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
  if (error instanceof Error && error.message === "edition_not_found")
    return apiFailure("not_found", "La edición no existe", 404);
  if (error instanceof Error && error.message === "edition_closed")
    return apiFailure("edition_closed", "La edición está cerrada", 409);
  return apiFailure("budget_unavailable", "No se ha podido guardar el movimiento", 503);
}
