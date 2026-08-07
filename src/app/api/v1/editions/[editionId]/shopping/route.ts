import { and, asc, eq, ilike, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  auditEvents,
  budgetBalances,
  budgetMovements,
  budgetRates,
  editions,
  editionParticipants,
  shoppingCategories,
  shoppingEditionPreferences,
  shoppingPreferences,
  shoppingProducts,
  shoppingPurchases,
  shoppingReceipts,
  shoppingStores,
} from "@/infrastructure/database/schema";
import { authenticateRequest, canEditEditionArea } from "@/shared/server/authorization";
import { IdentityError } from "@/modules/identity/domain/identity";
import {
  calculateShoppingTotal,
  shoppingStatuses,
  validateShoppingProductRules,
} from "@/modules/shopping/domain/product";
import { calculateShoppingSummary } from "@/modules/shopping/domain/summary";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

const productInputSchema = z.object({
  id: z.uuid().optional(),
  description: z.string().trim().max(240).default(""),
  category: z.string().trim().max(80).nullable().default(null),
  store: z.string().trim().max(120).nullable().default(null),
  assignment: z.string().trim().max(120).nullable().default(null),
  plannedQuantity: z.number().finite().nullable().default(null),
  realQuantity: z.number().finite().nullable().default(null),
  plannedUnitPrice: z.number().finite().min(0).nullable().default(null),
  realUnitPrice: z.number().finite().min(0).nullable().default(null),
  notes: z.string().trim().max(1000).nullable().default(null),
  status: z.enum(shoppingStatuses).default("pending"),
});
const deleteProductInputSchema = z.object({ id: z.uuid() });
const preferencesInputSchema = z.discriminatedUnion("scope", [
  z.object({
    scope: z.literal("general"),
    groupBy: z.enum(["category", "store", "assignment", "status"]),
    sortBy: z.enum(["description", "unit_price", "quantity", "total"]),
    sortDirection: z.enum(["asc", "desc"]),
  }),
  z.object({
    scope: z.literal("edition"),
    query: z.string().trim().max(240),
    status: z.enum(shoppingStatuses).nullable(),
    categoryId: z.uuid().nullable(),
    storeId: z.uuid().nullable(),
  }),
]);

function serialize(row: {
  plannedQuantity: string | null;
  plannedUnitPrice: string | null;
  realQuantity: string | null;
  realUnitPrice: string | null;
  [key: string]: unknown;
}) {
  return {
    ...row,
    plannedTotal: calculateShoppingTotal(row.plannedQuantity, row.plannedUnitPrice),
    realTotal: calculateShoppingTotal(row.realQuantity, row.realUnitPrice),
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
) {
  const { editionId } = await context.params;
  if (!z.uuid().safeParse(editionId).success)
    return apiFailure("invalid_request", "La edición no es válida", 400);
  try {
    const { database, member } = await authenticateRequest(request);
    const params = request.nextUrl.searchParams;
    const search = params.get("q")?.trim();
    const status = params.get("status");
    const categoryId = params.get("categoryId");
    const storeId = params.get("storeId");
    const conditions = [eq(shoppingProducts.editionId, editionId)];
    if (search)
      conditions.push(
        or(
          ilike(shoppingProducts.description, `%${search}%`),
          ilike(shoppingProducts.notes, `%${search}%`),
        )!,
      );
    if (status && shoppingStatuses.includes(status as (typeof shoppingStatuses)[number]))
      conditions.push(eq(shoppingProducts.status, status));
    if (categoryId && z.uuid().safeParse(categoryId).success)
      conditions.push(eq(shoppingProducts.categoryId, categoryId));
    if (storeId && z.uuid().safeParse(storeId).success)
      conditions.push(eq(shoppingProducts.storeId, storeId));
    const [
      rows,
      categories,
      stores,
      generalPreferences,
      editionPreferences,
      allProducts,
      rates,
      balances,
      movements,
      purchases,
      receipts,
    ] = await Promise.all([
      database
        .select({
          id: shoppingProducts.id,
          editionId: shoppingProducts.editionId,
          description: shoppingProducts.description,
          categoryId: shoppingProducts.categoryId,
          categoryName: shoppingCategories.name,
          storeId: shoppingProducts.storeId,
          storeName: shoppingStores.name,
          assignment: shoppingProducts.assignment,
          plannedQuantity: shoppingProducts.plannedQuantity,
          realQuantity: shoppingProducts.realQuantity,
          plannedUnitPrice: shoppingProducts.plannedUnitPrice,
          realUnitPrice: shoppingProducts.realUnitPrice,
          notes: shoppingProducts.notes,
          status: shoppingProducts.status,
          createdAt: shoppingProducts.createdAt,
          updatedAt: shoppingProducts.updatedAt,
        })
        .from(shoppingProducts)
        .leftJoin(shoppingCategories, eq(shoppingCategories.id, shoppingProducts.categoryId))
        .leftJoin(shoppingStores, eq(shoppingStores.id, shoppingProducts.storeId))
        .where(and(...conditions))
        .orderBy(asc(shoppingProducts.status), asc(shoppingProducts.description)),
      database
        .select({ id: shoppingCategories.id, name: shoppingCategories.name })
        .from(shoppingCategories)
        .where(eq(shoppingCategories.editionId, editionId))
        .orderBy(asc(shoppingCategories.name)),
      database
        .select({ id: shoppingStores.id, name: shoppingStores.name })
        .from(shoppingStores)
        .where(eq(shoppingStores.editionId, editionId))
        .orderBy(asc(shoppingStores.name)),
      database
        .select({
          groupBy: shoppingPreferences.groupBy,
          sortBy: shoppingPreferences.sortBy,
          sortDirection: shoppingPreferences.sortDirection,
        })
        .from(shoppingPreferences)
        .where(eq(shoppingPreferences.memberId, member.memberId))
        .limit(1),
      database
        .select({
          query: shoppingEditionPreferences.query,
          status: shoppingEditionPreferences.status,
          categoryId: shoppingEditionPreferences.categoryId,
          storeId: shoppingEditionPreferences.storeId,
        })
        .from(shoppingEditionPreferences)
        .where(
          and(
            eq(shoppingEditionPreferences.memberId, member.memberId),
            eq(shoppingEditionPreferences.editionId, editionId),
          ),
        )
        .limit(1),
      database
        .select({
          plannedQuantity: shoppingProducts.plannedQuantity,
          plannedUnitPrice: shoppingProducts.plannedUnitPrice,
          realQuantity: shoppingProducts.realQuantity,
          realUnitPrice: shoppingProducts.realUnitPrice,
          status: shoppingProducts.status,
          assignment: shoppingProducts.assignment,
        })
        .from(shoppingProducts)
        .where(eq(shoppingProducts.editionId, editionId)),
      database
        .select({ amount: budgetRates.amount })
        .from(editionParticipants)
        .innerJoin(budgetRates, eq(budgetRates.id, editionParticipants.rateId))
        .where(eq(editionParticipants.editionId, editionId)),
      database
        .select({ amount: budgetBalances.amount })
        .from(budgetBalances)
        .where(eq(budgetBalances.editionId, editionId)),
      database
        .select({ amount: budgetMovements.amount, isPlanned: budgetMovements.isPlanned })
        .from(budgetMovements)
        .where(eq(budgetMovements.editionId, editionId)),
      database
        .select({ id: shoppingPurchases.id, totalAmount: shoppingPurchases.totalAmount })
        .from(shoppingPurchases)
        .where(eq(shoppingPurchases.editionId, editionId)),
      database
        .select({ purchaseId: shoppingReceipts.purchaseId })
        .from(shoppingReceipts)
        .innerJoin(shoppingPurchases, eq(shoppingPurchases.id, shoppingReceipts.purchaseId))
        .where(eq(shoppingPurchases.editionId, editionId)),
    ]);
    const budgetTotal =
      rates.reduce((total, rate) => total + Number(rate.amount), 0) +
      balances.reduce((total, balance) => total + Number(balance.amount), 0) +
      movements
        .filter((movement) => movement.isPlanned)
        .reduce((total, movement) => total + Number(movement.amount), 0);
    const ticketedPurchaseIds = new Set(receipts.map((receipt) => receipt.purchaseId));
    const realTotal = purchases
      .filter((purchase) => ticketedPurchaseIds.has(purchase.id))
      .reduce((total, purchase) => total + Number(purchase.totalAmount), 0);
    const assignments = [
      ...new Set(
        allProducts
          .map((product) => product.assignment?.trim())
          .filter((assignment): assignment is string => Boolean(assignment)),
      ),
    ]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ id: name, name }));
    return apiSuccess({
      products: rows.map(serialize),
      categories,
      stores,
      assignments,
      preferences: {
        general: generalPreferences[0] ?? {
          groupBy: "category",
          sortBy: "description",
          sortDirection: "asc",
        },
        edition: editionPreferences[0] ?? {
          query: "",
          status: null,
          categoryId: null,
          storeId: null,
        },
      },
      summary: calculateShoppingSummary(allProducts, budgetTotal, realTotal),
    });
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("shopping_unavailable", "No se ha podido consultar la lista de compra", 503);
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
  const input = preferencesInputSchema.safeParse(body);
  if (!input.success) return apiFailure("invalid_request", "Las preferencias no son válidas", 400);
  try {
    const { database, member } = await authenticateRequest(request);
    if (input.data.scope === "general") {
      await database
        .insert(shoppingPreferences)
        .values({
          memberId: member.memberId,
          groupBy: input.data.groupBy,
          sortBy: input.data.sortBy,
          sortDirection: input.data.sortDirection,
        })
        .onConflictDoUpdate({
          target: shoppingPreferences.memberId,
          set: {
            groupBy: input.data.groupBy,
            sortBy: input.data.sortBy,
            sortDirection: input.data.sortDirection,
            updatedAt: new Date(),
          },
        });
      return apiSuccess(input.data);
    }
    if (input.data.categoryId) {
      const category = await database
        .select({ id: shoppingCategories.id })
        .from(shoppingCategories)
        .where(
          and(
            eq(shoppingCategories.id, input.data.categoryId),
            eq(shoppingCategories.editionId, editionId),
          ),
        )
        .limit(1);
      if (!category.length)
        return apiFailure("invalid_request", "La categoría no pertenece a esta edición", 400);
    }
    if (input.data.storeId) {
      const store = await database
        .select({ id: shoppingStores.id })
        .from(shoppingStores)
        .where(
          and(eq(shoppingStores.id, input.data.storeId), eq(shoppingStores.editionId, editionId)),
        )
        .limit(1);
      if (!store.length)
        return apiFailure("invalid_request", "La tienda no pertenece a esta edición", 400);
    }
    await database
      .insert(shoppingEditionPreferences)
      .values({
        memberId: member.memberId,
        editionId,
        query: input.data.query,
        status: input.data.status,
        categoryId: input.data.categoryId,
        storeId: input.data.storeId,
      })
      .onConflictDoUpdate({
        target: [shoppingEditionPreferences.memberId, shoppingEditionPreferences.editionId],
        set: {
          query: input.data.query,
          status: input.data.status,
          categoryId: input.data.categoryId,
          storeId: input.data.storeId,
          updatedAt: new Date(),
        },
      });
    return apiSuccess(input.data);
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("shopping_unavailable", "No se han podido guardar las preferencias", 503);
  }
}

async function mutate(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
  mode: "create" | "update",
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
  const input = productInputSchema.safeParse(body);
  if (!input.success || (mode === "update" && !input.data.id))
    return apiFailure("invalid_request", "El producto no es válido", 400);
  const ruleError = validateShoppingProductRules(input.data);
  if (ruleError === "negative_quantity_requires_note")
    return apiFailure("invalid_request", "Las cantidades negativas requieren una nota", 400);
  if (ruleError === "purchased_requires_real_price")
    return apiFailure("invalid_request", "Un producto comprado necesita precio real", 400);
  try {
    const { database, member } = await authenticateRequest(request);
    if (!(await canEditEditionArea(database, member.memberId, editionId, "shopping")))
      return apiFailure("forbidden", "No tienes permiso para editar compras", 403);
    const edition = await database
      .select({ status: editions.status })
      .from(editions)
      .where(eq(editions.id, editionId))
      .limit(1);
    if (!edition.length) return apiFailure("not_found", "La edición no existe", 404);
    if (edition[0].status === "closed")
      return apiFailure("edition_closed", "La edición está cerrada", 409);

    const existing =
      mode === "update"
        ? await database
            .select()
            .from(shoppingProducts)
            .where(
              and(
                eq(shoppingProducts.id, input.data.id!),
                eq(shoppingProducts.editionId, editionId),
              ),
            )
            .limit(1)
        : [];
    if (mode === "update" && !existing.length)
      return apiFailure("not_found", "El producto no existe en esta edición", 404);
    const [category] = input.data.category
      ? await database
          .select()
          .from(shoppingCategories)
          .where(
            and(
              eq(shoppingCategories.editionId, editionId),
              eq(shoppingCategories.name, input.data.category),
            ),
          )
          .limit(1)
      : [];
    const [store] = input.data.store
      ? await database
          .select()
          .from(shoppingStores)
          .where(
            and(eq(shoppingStores.editionId, editionId), eq(shoppingStores.name, input.data.store)),
          )
          .limit(1)
      : [];
    const categoryId = input.data.category ? (category?.id ?? randomUUID()) : null;
    const storeId = input.data.store ? (store?.id ?? randomUUID()) : null;
    const productId = input.data.id ?? randomUUID();
    const product = {
      id: productId,
      editionId,
      description: input.data.description,
      categoryId,
      storeId,
      assignment: input.data.assignment || null,
      plannedQuantity: input.data.plannedQuantity?.toFixed(3) ?? null,
      realQuantity: input.data.realQuantity?.toFixed(3) ?? null,
      plannedUnitPrice: input.data.plannedUnitPrice?.toFixed(2) ?? null,
      realUnitPrice: input.data.realUnitPrice?.toFixed(2) ?? null,
      notes: input.data.notes || null,
      status: input.data.status,
      updatedAt: new Date(),
    };
    const statements = [];
    if (input.data.category && !category)
      statements.push(
        database
          .insert(shoppingCategories)
          .values({ id: categoryId!, editionId, name: input.data.category }),
      );
    if (input.data.store && !store)
      statements.push(
        database.insert(shoppingStores).values({ id: storeId!, editionId, name: input.data.store }),
      );
    statements.push(
      mode === "create"
        ? database.insert(shoppingProducts).values(product)
        : database.update(shoppingProducts).set(product).where(eq(shoppingProducts.id, productId)),
    );
    statements.push(
      database.insert(auditEvents).values({
        memberId: member.memberId,
        action: mode === "create" ? "create" : "update",
        area: "shopping",
        entity: "shopping_product",
        entityId: productId,
        beforeValue: existing[0] ?? null,
        afterValue: product,
      }),
    );
    await database.batch(statements as never);
    return apiSuccess(product, mode === "create" ? 201 : 200);
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("shopping_unavailable", "No se ha podido guardar el producto", 503);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
) {
  return mutate(request, context, "create");
}
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
) {
  return mutate(request, context, "update");
}

export async function DELETE(
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
  const input = deleteProductInputSchema.safeParse(body);
  if (!input.success) return apiFailure("invalid_request", "El producto no es válido", 400);
  try {
    const { database, member } = await authenticateRequest(request);
    if (!(await canEditEditionArea(database, member.memberId, editionId, "shopping")))
      return apiFailure("forbidden", "No tienes permiso para editar compras", 403);
    const edition = await database
      .select({ status: editions.status })
      .from(editions)
      .where(eq(editions.id, editionId))
      .limit(1);
    if (!edition.length) return apiFailure("not_found", "La edición no existe", 404);
    if (edition[0].status === "closed")
      return apiFailure("edition_closed", "La edición está cerrada", 409);
    const existing = await database
      .select()
      .from(shoppingProducts)
      .where(and(eq(shoppingProducts.id, input.data.id), eq(shoppingProducts.editionId, editionId)))
      .limit(1);
    if (!existing.length) return apiFailure("not_found", "El producto no existe en esta edición", 404);
    await database.batch([
      database
        .delete(shoppingProducts)
        .where(and(eq(shoppingProducts.id, input.data.id), eq(shoppingProducts.editionId, editionId))),
      database.insert(auditEvents).values({
        memberId: member.memberId,
        action: "delete",
        area: "shopping",
        entity: "shopping_product",
        entityId: input.data.id,
        beforeValue: existing[0],
        afterValue: null,
      }),
    ] as never);
    return apiSuccess({ id: input.data.id });
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("shopping_unavailable", "No se ha podido borrar el producto", 503);
  }
}
