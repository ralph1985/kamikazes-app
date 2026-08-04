import { and, asc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import {
  auditEvents,
  budgetRates,
  editionParticipants,
  editions,
  members,
  roleAssignments,
} from "@/infrastructure/database/schema";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";
const rateInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amount: z.number().finite().min(0).max(9999999999.99),
});
const rateAssignmentSchema = z.object({ memberId: z.uuid(), rateId: z.uuid().nullable() });

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

async function canEditBudget(
  database: ReturnType<typeof getDatabase>,
  memberId: string,
  editionId: string,
) {
  if (await createDatabaseGlobalAdminReader(database).isGlobalAdmin(memberId)) return true;
  const editor = await database
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
  return editor.length > 0;
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
    const [rates, rows] = await Promise.all([
      database
        .select({ id: budgetRates.id, name: budgetRates.name, amount: budgetRates.amount })
        .from(budgetRates)
        .where(eq(budgetRates.editionId, editionId))
        .orderBy(asc(budgetRates.amount), asc(budgetRates.name)),
      database
        .select({
          memberId: members.id,
          displayName: members.displayName,
          rateId: editionParticipants.rateId,
          rateName: budgetRates.name,
          rateAmount: budgetRates.amount,
        })
        .from(members)
        .innerJoin(
          editionParticipants,
          and(
            eq(editionParticipants.memberId, members.id),
            eq(editionParticipants.editionId, editionId),
          ),
        )
        .leftJoin(budgetRates, eq(budgetRates.id, editionParticipants.rateId))
        .orderBy(asc(members.displayName)),
    ]);
    return apiSuccess({
      rates,
      participants: rows.map((row) => ({ ...row, participating: true })),
    });
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("budget_unavailable", "No se ha podido consultar el presupuesto", 503);
  }
}

export async function POST(
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
  const input = rateInputSchema.safeParse(body);
  if (!input.success) return apiFailure("invalid_request", "La tarifa no es válida", 400);
  try {
    const { database, member } = await authenticate(request);
    if (!(await canEditBudget(database, member.memberId, editionId)))
      return apiFailure("forbidden", "No tienes permiso para editar el presupuesto", 403);
    const rateId = randomUUID();
    const edition = await database
      .select({ status: editions.status })
      .from(editions)
      .where(eq(editions.id, editionId))
      .limit(1);
    if (edition.length === 0) throw new Error("edition_not_found");
    if (edition[0].status === "closed") throw new Error("edition_closed");
    const rate = {
      id: rateId,
      editionId,
      name: input.data.name,
      amount: input.data.amount.toFixed(2),
    };
    await database.batch([
      database.insert(budgetRates).values(rate),
      database.insert(auditEvents).values({
        memberId: member.memberId,
        action: "create",
        area: "budget",
        entity: "budget_rate",
        entityId: rateId,
        beforeValue: null,
        afterValue: rate,
      }),
    ]);
    const result = rate;
    return apiSuccess(result, 201);
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    if (error instanceof Error && error.message === "edition_not_found")
      return apiFailure("not_found", "La edición no existe", 404);
    if (error instanceof Error && error.message === "edition_closed")
      return apiFailure("edition_closed", "La edición está cerrada", 409);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505")
      return apiFailure("rate_exists", "Ya existe una tarifa con ese nombre", 409);
    return apiFailure("budget_unavailable", "No se ha podido crear la tarifa", 503);
  }
}

export async function PUT(
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
  const input = rateAssignmentSchema.safeParse(body);
  if (!input.success)
    return apiFailure("invalid_request", "La asignación de tarifa no es válida", 400);
  try {
    const { database, member } = await authenticate(request);
    if (!(await canEditBudget(database, member.memberId, editionId)))
      return apiFailure("forbidden", "No tienes permiso para editar el presupuesto", 403);
    const edition = await database
      .select({ status: editions.status })
      .from(editions)
      .where(eq(editions.id, editionId))
      .limit(1);
    if (edition.length === 0) throw new Error("edition_not_found");
    if (edition[0].status === "closed") throw new Error("edition_closed");
    const participant = await database
      .select({ id: editionParticipants.id, rateId: editionParticipants.rateId })
      .from(editionParticipants)
      .where(
        and(
          eq(editionParticipants.editionId, editionId),
          eq(editionParticipants.memberId, input.data.memberId),
        ),
      )
      .limit(1);
    if (participant.length === 0) throw new Error("not_annual_participant");
    if (input.data.rateId) {
      const rate = await database
        .select({ id: budgetRates.id })
        .from(budgetRates)
        .where(and(eq(budgetRates.id, input.data.rateId), eq(budgetRates.editionId, editionId)))
        .limit(1);
      if (rate.length === 0) throw new Error("rate_not_found");
    }
    const result = { memberId: input.data.memberId, rateId: input.data.rateId };
    await database.batch([
      database
        .update(editionParticipants)
        .set({ rateId: input.data.rateId, updatedAt: new Date() })
        .where(eq(editionParticipants.id, participant[0].id)),
      database.insert(auditEvents).values({
        memberId: member.memberId,
        action: "update",
        area: "budget",
        entity: "edition_participant",
        entityId: input.data.memberId,
        beforeValue: { rateId: participant[0].rateId },
        afterValue: { rateId: input.data.rateId, editionId },
      }),
    ]);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    if (error instanceof Error && error.message === "edition_not_found")
      return apiFailure("not_found", "La edición no existe", 404);
    if (error instanceof Error && error.message === "edition_closed")
      return apiFailure("edition_closed", "La edición está cerrada", 409);
    if (error instanceof Error && error.message === "not_annual_participant")
      return apiFailure("invalid_request", "El miembro no participa en esta edición", 409);
    if (error instanceof Error && error.message === "rate_not_found")
      return apiFailure("invalid_request", "La tarifa no pertenece a esta edición", 409);
    return apiFailure("budget_unavailable", "No se ha podido actualizar la tarifa", 503);
  }
}
