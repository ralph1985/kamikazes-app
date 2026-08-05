import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import {
  auditEvents,
  editions,
  members,
  roleAssignments,
  shoppingPurchases,
  shoppingStores,
} from "@/infrastructure/database/schema";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

const purchaseSchema = z.object({
  id: z.uuid().optional(),
  storeId: z.uuid().nullable(),
  purchaserMemberId: z.uuid(),
  purchasedAt: z.coerce.date(),
  totalAmount: z.number().finite().min(0).max(9999999999.99),
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
  const editor = await database
    .select({ id: roleAssignments.id })
    .from(roleAssignments)
    .where(
      and(
        eq(roleAssignments.memberId, memberId),
        eq(roleAssignments.editionId, editionId),
        eq(roleAssignments.area, "shopping"),
        eq(roleAssignments.role, "editor"),
      ),
    )
    .limit(1);
  return editor.length > 0;
}

async function assertOpenEdition(database: ReturnType<typeof getDatabase>, editionId: string) {
  const edition = await database
    .select({ status: editions.status })
    .from(editions)
    .where(eq(editions.id, editionId))
    .limit(1);
  if (!edition.length) throw new Error("edition_not_found");
  if (edition[0].status === "closed") throw new Error("edition_closed");
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
    const purchases = await database
      .select({
        id: shoppingPurchases.id,
        storeId: shoppingPurchases.storeId,
        storeName: shoppingStores.name,
        purchaserMemberId: shoppingPurchases.purchaserMemberId,
        purchaserName: members.displayName,
        purchasedAt: shoppingPurchases.purchasedAt,
        totalAmount: shoppingPurchases.totalAmount,
        notes: shoppingPurchases.notes,
        createdAt: shoppingPurchases.createdAt,
        updatedAt: shoppingPurchases.updatedAt,
      })
      .from(shoppingPurchases)
      .innerJoin(members, eq(members.id, shoppingPurchases.purchaserMemberId))
      .leftJoin(shoppingStores, eq(shoppingStores.id, shoppingPurchases.storeId))
      .where(eq(shoppingPurchases.editionId, editionId))
      .orderBy(desc(shoppingPurchases.purchasedAt));
    return apiSuccess({ purchases });
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("shopping_unavailable", "No se han podido consultar las compras", 503);
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFailure("invalid_request", "El cuerpo debe ser JSON válido", 400);
  }
  const id = z.object({ id: z.uuid() }).safeParse(body);
  if (!id.success) return apiFailure("invalid_request", "La compra no es válida", 400);
  return mutate(request, context, id.data.id, body);
}

async function mutate(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
  purchaseId: string | null,
  bodyValue?: unknown,
) {
  const { editionId } = await context.params;
  if (!z.uuid().safeParse(editionId).success)
    return apiFailure("invalid_request", "La edición no es válida", 400);
  let body = bodyValue;
  if (body === undefined) {
    try {
      body = await request.json();
    } catch {
      return apiFailure("invalid_request", "El cuerpo debe ser JSON válido", 400);
    }
  }
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success)
    return apiFailure("invalid_request", "Los datos de la compra no son válidos", 400);
  try {
    const { database, member } = await authenticate(request);
    if (!(await canEdit(database, member.memberId, editionId)))
      return apiFailure("forbidden", "No tienes permiso para editar compras", 403);
    await assertOpenEdition(database, editionId);
    const purchaser = await database
      .select({ id: members.id })
      .from(members)
      .where(eq(members.id, parsed.data.purchaserMemberId))
      .limit(1);
    if (!purchaser.length)
      return apiFailure("invalid_request", "La persona compradora no existe", 400);
    if (parsed.data.storeId) {
      const store = await database
        .select({ id: shoppingStores.id })
        .from(shoppingStores)
        .where(
          and(eq(shoppingStores.id, parsed.data.storeId), eq(shoppingStores.editionId, editionId)),
        )
        .limit(1);
      if (!store.length)
        return apiFailure("invalid_request", "La tienda no pertenece a esta edición", 400);
    }
    const existing = purchaseId
      ? await database
          .select()
          .from(shoppingPurchases)
          .where(
            and(eq(shoppingPurchases.id, purchaseId), eq(shoppingPurchases.editionId, editionId)),
          )
          .limit(1)
      : [];
    if (purchaseId && !existing.length)
      return apiFailure("not_found", "La compra no existe en esta edición", 404);
    const id = purchaseId ?? randomUUID();
    const values = {
      editionId,
      storeId: parsed.data.storeId,
      purchaserMemberId: parsed.data.purchaserMemberId,
      purchasedAt: parsed.data.purchasedAt,
      totalAmount: parsed.data.totalAmount.toFixed(2),
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    };
    const mutation = purchaseId
      ? database.update(shoppingPurchases).set(values).where(eq(shoppingPurchases.id, purchaseId))
      : database.insert(shoppingPurchases).values({ id, ...values });
    await database.batch([
      mutation,
      database.insert(auditEvents).values({
        memberId: member.memberId,
        action: purchaseId ? "update" : "create",
        area: "shopping",
        entity: "shopping_purchase",
        entityId: id,
        beforeValue: existing[0] ?? null,
        afterValue: values,
      }),
    ]);
    return apiSuccess({ id, ...values }, purchaseId ? 200 : 201);
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    if (error instanceof Error && error.message === "edition_not_found")
      return apiFailure("not_found", "La edición no existe", 404);
    if (error instanceof Error && error.message === "edition_closed")
      return apiFailure("edition_closed", "La edición está cerrada", 409);
    return apiFailure("shopping_unavailable", "No se ha podido guardar la compra", 503);
  }
}
