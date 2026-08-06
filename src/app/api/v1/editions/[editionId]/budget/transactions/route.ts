import { and, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  auditEvents,
  budgetTransactions,
  editionParticipants,
  members,
} from "@/infrastructure/database/schema";
import {
  assertEditionOpen,
  authenticateRequest,
  canEditEditionArea,
} from "@/shared/server/authorization";
import { IdentityError } from "@/modules/identity/domain/identity";
import { prepareBudgetTransaction } from "@/modules/budget/application/prepare-transaction";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

const transactionSchema = z.object({
  memberId: z.uuid(),
  kind: z.enum(["payment", "refund"]),
  amount: z.number().finite().positive().max(9999999999.99),
  occurredAt: z.coerce.date(),
  method: z.enum(["cash", "bizum", "transfer"]),
  notes: z.string().trim().max(1000).nullable(),
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
    const transactions = await database
      .select({
        id: budgetTransactions.id,
        memberId: budgetTransactions.memberId,
        displayName: members.displayName,
        kind: budgetTransactions.kind,
        amount: budgetTransactions.amount,
        occurredAt: budgetTransactions.occurredAt,
        method: budgetTransactions.method,
        notes: budgetTransactions.notes,
      })
      .from(budgetTransactions)
      .innerJoin(members, eq(members.id, budgetTransactions.memberId))
      .where(eq(budgetTransactions.editionId, editionId))
      .orderBy(desc(budgetTransactions.occurredAt));
    return apiSuccess({ transactions });
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("budget_unavailable", "No se han podido consultar los movimientos", 503);
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
  const body = await readJson(request);
  if (!body.success) return body.response;
  const idResult = z.object({ id: z.uuid() }).safeParse(body.value);
  if (!idResult.success) return apiFailure("invalid_request", "El movimiento no es válido", 400);
  return mutate(request, context, idResult.data.id, body.value);
}

async function mutate(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
  transactionId: string | null,
  bodyValue?: unknown,
) {
  const { editionId } = await context.params;
  if (!z.uuid().safeParse(editionId).success)
    return apiFailure("invalid_request", "La edición no es válida", 400);
  const body =
    bodyValue === undefined
      ? await readJson(request)
      : { success: true as const, value: bodyValue };
  if (!body.success) return body.response;
  const parsed = transactionSchema.safeParse(body.value);
  if (!parsed.success) return apiFailure("invalid_request", "El movimiento no es válido", 400);

  try {
    const { database, member } = await authenticateRequest(request);
    if (!(await canEditEditionArea(database, member.memberId, editionId, "budget")))
      return apiFailure("forbidden", "No tienes permiso para editar el presupuesto", 403);
    await assertEditionOpen(database, editionId);
    const participant = await database
      .select({ id: editionParticipants.id })
      .from(editionParticipants)
      .where(
        and(
          eq(editionParticipants.editionId, editionId),
          eq(editionParticipants.memberId, parsed.data.memberId),
        ),
      )
      .limit(1);
    if (participant.length === 0) throw new Error("not_annual_participant");

    const existing = await database
      .select({ id: budgetTransactions.id, amount: budgetTransactions.amount })
      .from(budgetTransactions)
      .where(
        and(
          eq(budgetTransactions.editionId, editionId),
          eq(budgetTransactions.memberId, parsed.data.memberId),
        ),
      );
    const transaction = prepareBudgetTransaction(
      parsed.data.kind,
      parsed.data.amount,
      transactionId,
      existing,
    );
    if (!transaction.canApply) throw new Error("refund_exceeds_paid");

    const now = new Date();
    const values = {
      editionId,
      memberId: parsed.data.memberId,
      kind: parsed.data.kind,
      amount: transaction.signedAmount.toFixed(2),
      occurredAt: parsed.data.occurredAt,
      method: parsed.data.method,
      notes: parsed.data.notes,
      updatedAt: now,
    };
    let id = transactionId;
    let before: unknown = null;
    if (transactionId) {
      const current = await database
        .select()
        .from(budgetTransactions)
        .where(eq(budgetTransactions.id, transactionId))
        .limit(1);
      if (current.length === 0 || current[0].editionId !== editionId)
        return apiFailure("not_found", "El movimiento no existe", 404);
      before = current[0];
    } else {
      id = randomUUID();
    }
    const mutation = transactionId
      ? database
          .update(budgetTransactions)
          .set(values)
          .where(eq(budgetTransactions.id, transactionId))
      : database.insert(budgetTransactions).values({ id: id!, ...values });
    await database.batch([
      mutation,
      database.insert(auditEvents).values({
        memberId: member.memberId,
        action: transactionId ? "updated" : "created",
        area: "budget",
        entity: "budget_transaction",
        entityId: id!,
        beforeValue: before,
        afterValue: values,
      }),
    ]);
    return apiSuccess({ id, ...values }, transactionId ? 200 : 201);
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    if (error instanceof Error && error.message === "edition_not_found")
      return apiFailure("not_found", "La edición no existe", 404);
    if (error instanceof Error && error.message === "edition_closed")
      return apiFailure("edition_closed", "La edición está cerrada", 409);
    if (error instanceof Error && error.message === "not_annual_participant")
      return apiFailure("invalid_request", "El miembro no participa en esta edición", 409);
    if (error instanceof Error && error.message === "refund_exceeds_paid")
      return apiFailure("refund_exceeds_paid", "La devolución supera el importe neto pagado", 409);
    return apiFailure("budget_unavailable", "No se ha podido guardar el movimiento", 503);
  }
}

async function readJson(
  request: NextRequest,
): Promise<
  { success: true; value: unknown } | { success: false; response: ReturnType<typeof apiFailure> }
> {
  try {
    return { success: true, value: await request.json() };
  } catch {
    return {
      success: false,
      response: apiFailure("invalid_request", "El cuerpo debe ser JSON válido", 400),
    };
  }
}
