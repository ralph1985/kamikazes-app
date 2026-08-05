import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import {
  auditEvents,
  editions,
  roleAssignments,
  shoppingCategories,
  shoppingProducts,
  shoppingStores,
} from "@/infrastructure/database/schema";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

const copyInputSchema = z.object({ sourceEditionId: z.uuid() });

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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
) {
  const { editionId } = await context.params;
  if (!z.uuid().safeParse(editionId).success)
    return apiFailure("invalid_request", "La edición destino no es válida", 400);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFailure("invalid_request", "El cuerpo debe ser JSON válido", 400);
  }
  const input = copyInputSchema.safeParse(body);
  if (!input.success || input.data.sourceEditionId === editionId)
    return apiFailure("invalid_request", "La edición origen no es válida", 400);
  try {
    const { database, member } = await authenticate(request);
    if (!(await canEdit(database, member.memberId, editionId)))
      return apiFailure("forbidden", "No tienes permiso para editar compras", 403);
    const destination = await database
      .select({ status: editions.status })
      .from(editions)
      .where(eq(editions.id, editionId))
      .limit(1);
    const source = await database
      .select({ id: editions.id })
      .from(editions)
      .where(eq(editions.id, input.data.sourceEditionId))
      .limit(1);
    if (!destination.length || !source.length)
      return apiFailure("not_found", "La edición origen o destino no existe", 404);
    if (destination[0].status === "closed")
      return apiFailure("edition_closed", "La edición está cerrada", 409);

    const sourceProducts = await database
      .select({
        description: shoppingProducts.description,
        categoryName: shoppingCategories.name,
        storeName: shoppingStores.name,
        assignment: shoppingProducts.assignment,
        plannedQuantity: shoppingProducts.plannedQuantity,
        plannedUnitPrice: shoppingProducts.plannedUnitPrice,
        notes: shoppingProducts.notes,
      })
      .from(shoppingProducts)
      .leftJoin(shoppingCategories, eq(shoppingCategories.id, shoppingProducts.categoryId))
      .leftJoin(shoppingStores, eq(shoppingStores.id, shoppingProducts.storeId))
      .where(eq(shoppingProducts.editionId, input.data.sourceEditionId));

    const destinationCategories = await database
      .select({ id: shoppingCategories.id, name: shoppingCategories.name })
      .from(shoppingCategories)
      .where(eq(shoppingCategories.editionId, editionId));
    const destinationStores = await database
      .select({ id: shoppingStores.id, name: shoppingStores.name })
      .from(shoppingStores)
      .where(eq(shoppingStores.editionId, editionId));
    const categoryIds = new Map(destinationCategories.map((item) => [item.name, item.id]));
    const storeIds = new Map(destinationStores.map((item) => [item.name, item.id]));
    const statements: BatchItem<"pg">[] = [];
    const copiedProducts = sourceProducts.map((product) => {
      let categoryId = product.categoryName ? categoryIds.get(product.categoryName) : undefined;
      if (product.categoryName && !categoryId) {
        categoryId = randomUUID();
        categoryIds.set(product.categoryName, categoryId);
        statements.push(
          database.insert(shoppingCategories).values({
            id: categoryId,
            editionId,
            name: product.categoryName,
          }),
        );
      }
      let storeId = product.storeName ? storeIds.get(product.storeName) : undefined;
      if (product.storeName && !storeId) {
        storeId = randomUUID();
        storeIds.set(product.storeName, storeId);
        statements.push(
          database
            .insert(shoppingStores)
            .values({ id: storeId, editionId, name: product.storeName }),
        );
      }
      const id = randomUUID();
      const copied = {
        id,
        editionId,
        description: product.description,
        categoryId: categoryId ?? null,
        storeId: storeId ?? null,
        assignment: product.assignment,
        plannedQuantity: product.plannedQuantity,
        plannedUnitPrice: product.plannedUnitPrice,
        realQuantity: null,
        realUnitPrice: null,
        notes: product.notes,
        status: "pending",
      };
      statements.push(database.insert(shoppingProducts).values(copied));
      statements.push(
        database.insert(auditEvents).values({
          memberId: member.memberId,
          action: "copy",
          area: "shopping",
          entity: "shopping_product",
          entityId: id,
          beforeValue: null,
          afterValue: { ...copied, sourceEditionId: input.data.sourceEditionId },
        }),
      );
      return id;
    });
    if (statements.length) await database.batch([statements[0], ...statements.slice(1)]);
    return apiSuccess(
      { sourceEditionId: input.data.sourceEditionId, copiedCount: copiedProducts.length },
      201,
    );
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("shopping_unavailable", "No se ha podido copiar la lista de compra", 503);
  }
}
