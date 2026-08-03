import { and, asc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import {
  auditEvents,
  budgetParticipants,
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

const participantInputSchema = z.object({
  memberId: z.uuid(),
  participating: z.boolean(),
  rateId: z.uuid().nullable(),
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
          participating: budgetParticipants.memberId,
          rateId: budgetParticipants.rateId,
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
        .leftJoin(
          budgetParticipants,
          and(
            eq(budgetParticipants.memberId, members.id),
            eq(budgetParticipants.editionId, editionId),
          ),
        )
        .leftJoin(budgetRates, eq(budgetRates.id, budgetParticipants.rateId))
        .orderBy(asc(members.displayName)),
    ]);
    return apiSuccess({
      rates,
      participants: rows.map((row) => ({ ...row, participating: row.participating !== null })),
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
    const result = await database.transaction(async (tx) => {
      const edition = await tx
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
      await tx.insert(budgetRates).values(rate);
      await tx
        .insert(auditEvents)
        .values({
          memberId: member.memberId,
          action: "create",
          area: "budget",
          entity: "budget_rate",
          entityId: rateId,
          beforeValue: null,
          afterValue: rate,
        });
      return rate;
    });
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
  const input = participantInputSchema.safeParse(body);
  if (!input.success)
    return apiFailure("invalid_request", "La participación económica no es válida", 400);
  try {
    const { database, member } = await authenticate(request);
    if (!(await canEditBudget(database, member.memberId, editionId)))
      return apiFailure("forbidden", "No tienes permiso para editar el presupuesto", 403);
    const result = await database.transaction(async (tx) => {
      const edition = await tx
        .select({ status: editions.status })
        .from(editions)
        .where(eq(editions.id, editionId))
        .limit(1);
      if (edition.length === 0) throw new Error("edition_not_found");
      if (edition[0].status === "closed") throw new Error("edition_closed");
      const annual = await tx
        .select({ id: editionParticipants.id })
        .from(editionParticipants)
        .where(
          and(
            eq(editionParticipants.editionId, editionId),
            eq(editionParticipants.memberId, input.data.memberId),
          ),
        )
        .limit(1);
      if (annual.length === 0) throw new Error("not_annual_participant");
      if (input.data.rateId) {
        const rate = await tx
          .select({ id: budgetRates.id })
          .from(budgetRates)
          .where(and(eq(budgetRates.id, input.data.rateId), eq(budgetRates.editionId, editionId)))
          .limit(1);
        if (rate.length === 0) throw new Error("rate_not_found");
      }
      const before = await tx
        .select({ id: budgetParticipants.id, rateId: budgetParticipants.rateId })
        .from(budgetParticipants)
        .where(
          and(
            eq(budgetParticipants.editionId, editionId),
            eq(budgetParticipants.memberId, input.data.memberId),
          ),
        )
        .limit(1);
      if (input.data.participating) {
        if (before.length === 0)
          await tx
            .insert(budgetParticipants)
            .values({ editionId, memberId: input.data.memberId, rateId: input.data.rateId });
        else
          await tx
            .update(budgetParticipants)
            .set({ rateId: input.data.rateId, updatedAt: new Date() })
            .where(eq(budgetParticipants.id, before[0].id));
      } else if (before.length > 0)
        await tx.delete(budgetParticipants).where(eq(budgetParticipants.id, before[0].id));
      await tx
        .insert(auditEvents)
        .values({
          memberId: member.memberId,
          action: "update",
          area: "budget",
          entity: "budget_participant",
          entityId: input.data.memberId,
          beforeValue: { participating: before.length > 0, rateId: before[0]?.rateId ?? null },
          afterValue: {
            participating: input.data.participating,
            rateId: input.data.participating ? input.data.rateId : null,
            editionId,
          },
        });
      return {
        memberId: input.data.memberId,
        participating: input.data.participating,
        rateId: input.data.participating ? input.data.rateId : null,
      };
    });
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
    return apiFailure(
      "budget_unavailable",
      "No se ha podido actualizar la participación económica",
      503,
    );
  }
}
