import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { auditEvents, budgetBalances, editions } from "@/infrastructure/database/schema";
import {
  assertEditionOpen,
  authenticateRequest,
  canEditEditionArea,
  isGlobalAdmin,
} from "@/shared/server/authorization";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

const balanceSchema = z.object({
  amount: z
    .number()
    .finite()
    .min(-9999999999.99)
    .max(9999999999.99)
    .refine((value) => value !== 0),
  concept: z.string().trim().min(1).max(240),
  originYear: z.number().int().min(1900).max(2200).nullable(),
  originEditionId: z.uuid().nullable(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
) {
  const { editionId } = await context.params;
  if (!z.uuid().safeParse(editionId).success)
    return apiFailure("invalid_request", "La edición no es válida", 400);
  try {
    const { database } = await authenticateRequest(request);
    const balances = await database
      .select()
      .from(budgetBalances)
      .where(eq(budgetBalances.editionId, editionId))
      .orderBy(asc(budgetBalances.createdAt));
    return apiSuccess({ balances });
  } catch (error) {
    return error instanceof IdentityError
      ? apiFailure("unauthenticated", "Necesitas iniciar sesión", 401)
      : apiFailure("budget_unavailable", "No se han podido consultar los saldos", 503);
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
  if (!id.success) return apiFailure("invalid_request", "El saldo no es válido", 400);
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
  if (!input.success) return apiFailure("invalid_request", "El saldo no es válido", 400);
  try {
    const { database, member } = await authenticateRequest(request);
    if (!(await canEditEditionArea(database, member.memberId, editionId, "budget")))
      return apiFailure("forbidden", "No tienes permiso para editar el presupuesto", 403);
    await assertEditionOpen(database, editionId);
    const current = await database
      .select()
      .from(budgetBalances)
      .where(and(eq(budgetBalances.id, input.data.id), eq(budgetBalances.editionId, editionId)))
      .limit(1);
    if (current.length === 0) return apiFailure("not_found", "El saldo no existe", 404);
    await database.batch([
      database.delete(budgetBalances).where(eq(budgetBalances.id, input.data.id)),
      database.insert(auditEvents).values({
        id: randomUUID(),
        memberId: member.memberId,
        action: "deleted",
        area: "budget",
        entity: "budget_balance",
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
  const input = balanceSchema.safeParse(body.value);
  if (!input.success) return apiFailure("invalid_request", "El saldo no es válido", 400);
  try {
    const { database, member } = await authenticateRequest(request);
    const isAdmin = await isGlobalAdmin(database, member.memberId);
    if (!(isAdmin || (await canEditEditionArea(database, member.memberId, editionId, "budget"))))
      return apiFailure("forbidden", "No tienes permiso para editar el presupuesto", 403);
    await assertEditionOpen(database, editionId);
    if (input.data.originEditionId) {
      const origin = await database
        .select({ id: editions.id })
        .from(editions)
        .where(eq(editions.id, input.data.originEditionId))
        .limit(1);
      if (origin.length === 0)
        return apiFailure("invalid_request", "La edición de origen no existe", 400);
      if (!isAdmin)
        return apiFailure("forbidden", "Sólo el administrador puede trasladar saldos", 403);
    }
    const values = {
      editionId,
      amount: input.data.amount.toFixed(2),
      concept: input.data.concept,
      originYear: input.data.originYear,
      originEditionId: input.data.originEditionId,
      updatedAt: new Date(),
    };
    let before: unknown = null;
    const balanceId = id ?? randomUUID();
    if (id) {
      const current = await database
        .select()
        .from(budgetBalances)
        .where(and(eq(budgetBalances.id, id), eq(budgetBalances.editionId, editionId)))
        .limit(1);
      if (current.length === 0) return apiFailure("not_found", "El saldo no existe", 404);
      before = current[0];
    }
    const mutation = id
      ? database.update(budgetBalances).set(values).where(eq(budgetBalances.id, id))
      : database.insert(budgetBalances).values({ id: balanceId, ...values });
    await database.batch([
      mutation,
      database.insert(auditEvents).values({
        id: randomUUID(),
        memberId: member.memberId,
        action: id ? "updated" : "created",
        area: "budget",
        entity: "budget_balance",
        entityId: balanceId,
        beforeValue: before,
        afterValue: values,
      }),
    ]);
    return apiSuccess({ id: balanceId, ...values }, id ? 200 : 201);
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
  return apiFailure("budget_unavailable", "No se ha podido guardar el saldo", 503);
}
