import { and, asc, eq, isNull, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  auditEvents,
  editions,
  inventoryItems,
  inventoryLocations,
  inventoryMovements,
  leftovers,
} from "@/infrastructure/database/schema";
import {
  assertEditionOpen,
  authenticateRequest,
  canEditEditionArea,
} from "@/shared/server/authorization";
import {
  hasMovementEndpoint,
  usesDifferentMovementEndpoints,
} from "@/modules/inventory/domain/movement";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";
const locationSchema = z.object({
  type: z.literal("location"),
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(120),
});
const stockSchema = z.object({
  type: z.literal("stock"),
  id: z.uuid().optional(),
  locationId: z.uuid(),
  productName: z.string().trim().min(1).max(160),
  quantity: z.number().finite(),
  notes: z.string().trim().max(1000).nullable().default(null),
});
const leftoverSchema = z.object({
  type: z.literal("leftover"),
  id: z.uuid().optional(),
  sourceEditionId: z.uuid().nullable().default(null),
  locationId: z.uuid(),
  productName: z.string().trim().min(1).max(160),
  quantity: z.number().finite().min(0),
  status: z.enum(["available", "consumed", "discarded"]).default("available"),
  notes: z.string().trim().max(1000).nullable().default(null),
});
const movementSchema = z
  .object({
    type: z.literal("movement"),
    productName: z.string().trim().min(1).max(160),
    fromLocationId: z.uuid().nullable().default(null),
    toLocationId: z.uuid().nullable().default(null),
    quantity: z.number().finite().positive(),
    notes: z.string().trim().max(1000).nullable().default(null),
  })
  .refine(
    (value) => hasMovementEndpoint(value.fromLocationId, value.toLocationId),
    "Debe indicar un origen o un destino",
  )
  .refine(
    (value) => usesDifferentMovementEndpoints(value.fromLocationId, value.toLocationId),
    "El origen y el destino deben ser distintos",
  );
const inputSchema = z.discriminatedUnion("type", [
  locationSchema,
  stockSchema,
  movementSchema,
  leftoverSchema,
]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
) {
  const { editionId } = await context.params;
  if (!z.uuid().safeParse(editionId).success)
    return apiFailure("invalid_request", "La edición no es válida", 400);
  try {
    const { database, member } = await authenticateRequest(request);
    const [locations, items, movements, editionLeftovers] = await Promise.all([
      database
        .select()
        .from(inventoryLocations)
        .where(eq(inventoryLocations.editionId, editionId))
        .orderBy(asc(inventoryLocations.name)),
      database
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.editionId, editionId))
        .orderBy(asc(inventoryItems.productName)),
      database
        .select()
        .from(inventoryMovements)
        .where(eq(inventoryMovements.editionId, editionId))
        .orderBy(asc(inventoryMovements.createdAt)),
      database
        .select()
        .from(leftovers)
        .where(eq(leftovers.editionId, editionId))
        .orderBy(asc(leftovers.productName)),
    ]);
    return apiSuccess({
      locations,
      items,
      movements,
      leftovers: editionLeftovers,
      canEdit: await canEditEditionArea(database, member.memberId, editionId, "shopping"),
    });
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("inventory_unavailable", "No se ha podido consultar el inventario", 503);
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
  return mutate(request, context, "patch");
}

async function mutate(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
  mode: null | "patch",
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
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success)
    return apiFailure("invalid_request", "Los datos de inventario no son válidos", 400);
  try {
    const { database, member } = await authenticateRequest(request);
    if (!(await canEditEditionArea(database, member.memberId, editionId, "shopping")))
      return apiFailure("forbidden", "No tienes permiso para editar inventario", 403);
    await assertEditionOpen(database, editionId);
    const data = parsed.data;
    if (data.type === "location") {
      const id = data.id ?? randomUUID();
      const before = data.id
        ? await database
            .select()
            .from(inventoryLocations)
            .where(
              and(eq(inventoryLocations.id, data.id), eq(inventoryLocations.editionId, editionId)),
            )
            .limit(1)
        : [];
      if (mode && !before.length) return apiFailure("not_found", "La ubicación no existe", 404);
      const values = { editionId, name: data.name, updatedAt: new Date() };
      await database.batch([
        mode
          ? database.update(inventoryLocations).set(values).where(eq(inventoryLocations.id, id))
          : database.insert(inventoryLocations).values({ id, ...values }),
        database.insert(auditEvents).values({
          memberId: member.memberId,
          action: mode ? "update" : "create",
          area: "shopping",
          entity: "inventory_location",
          entityId: id,
          beforeValue: before[0] ?? null,
          afterValue: values,
        }),
      ]);
      return apiSuccess({ id, ...values }, mode ? 200 : 201);
    }
    if (data.type === "stock") {
      const existing = data.id
        ? await database
            .select()
            .from(inventoryItems)
            .where(and(eq(inventoryItems.id, data.id), eq(inventoryItems.editionId, editionId)))
            .limit(1)
        : await database
            .select()
            .from(inventoryItems)
            .where(
              and(
                eq(inventoryItems.locationId, data.locationId),
                eq(inventoryItems.productName, data.productName),
              ),
            )
            .limit(1);
      if (mode && !existing.length)
        return apiFailure("not_found", "El elemento de inventario no existe", 404);
      const location = await database
        .select({ id: inventoryLocations.id })
        .from(inventoryLocations)
        .where(
          and(
            eq(inventoryLocations.id, data.locationId),
            eq(inventoryLocations.editionId, editionId),
          ),
        )
        .limit(1);
      if (!location.length)
        return apiFailure("invalid_request", "La ubicación no pertenece a esta edición", 400);
      const id = existing[0]?.id ?? randomUUID();
      const previousQuantity = Number(existing[0]?.quantity ?? 0);
      const quantity = mode ? data.quantity : previousQuantity + data.quantity;
      const delta = mode ? data.quantity - previousQuantity : data.quantity;
      const values = {
        editionId,
        locationId: data.locationId,
        productName: data.productName,
        quantity: quantity.toFixed(2),
        notes: data.notes,
        updatedAt: new Date(),
      };
      await database.batch([
        existing.length
          ? database.update(inventoryItems).set(values).where(eq(inventoryItems.id, id))
          : database.insert(inventoryItems).values({ id, ...values }),
        database.insert(inventoryMovements).values({
          id: randomUUID(),
          editionId,
          productName: data.productName,
          toLocationId: data.locationId,
          quantity: delta.toFixed(2),
          notes: data.notes,
          createdBy: member.memberId,
        }),
        database.insert(auditEvents).values({
          memberId: member.memberId,
          action: existing.length ? "update" : "create",
          area: "shopping",
          entity: "inventory_item",
          entityId: id,
          beforeValue: existing[0] ?? null,
          afterValue: values,
        }),
      ]);
      return apiSuccess({ id, ...values }, existing.length ? 200 : 201);
    }
    if (data.type === "movement") {
      if (mode)
        return apiFailure(
          "invalid_request",
          "Los movimientos no se corrigen; registra un ajuste nuevo",
          400,
        );
      const locationIds = [data.fromLocationId, data.toLocationId].filter(
        (value): value is string => Boolean(value),
      );
      const locations = await database
        .select({ id: inventoryLocations.id })
        .from(inventoryLocations)
        .where(
          and(
            eq(inventoryLocations.editionId, editionId),
            or(...locationIds.map((locationId) => eq(inventoryLocations.id, locationId))),
          ),
        );
      if (locations.length !== locationIds.length)
        return apiFailure(
          "invalid_request",
          "Las ubicaciones deben pertenecer a esta edición",
          400,
        );
      const source = data.fromLocationId
        ? await database
            .select()
            .from(inventoryItems)
            .where(
              and(
                eq(inventoryItems.editionId, editionId),
                eq(inventoryItems.locationId, data.fromLocationId),
                eq(inventoryItems.productName, data.productName),
              ),
            )
            .limit(1)
        : [];
      const target = data.toLocationId
        ? await database
            .select()
            .from(inventoryItems)
            .where(
              and(
                eq(inventoryItems.editionId, editionId),
                eq(inventoryItems.locationId, data.toLocationId),
                eq(inventoryItems.productName, data.productName),
              ),
            )
            .limit(1)
        : [];
      const statements = [];
      const changes: Array<{ locationId: string; before: unknown; after: unknown }> = [];
      if (data.fromLocationId) {
        const id = source[0]?.id ?? randomUUID();
        const values = {
          editionId,
          locationId: data.fromLocationId,
          productName: data.productName,
          quantity: (Number(source[0]?.quantity ?? 0) - data.quantity).toFixed(2),
          notes: source[0]?.notes ?? data.notes,
          updatedAt: new Date(),
        };
        statements.push(
          source.length
            ? database.update(inventoryItems).set(values).where(eq(inventoryItems.id, id))
            : database.insert(inventoryItems).values({ id, ...values }),
        );
        changes.push({ locationId: data.fromLocationId, before: source[0] ?? null, after: values });
      }
      if (data.toLocationId) {
        const id = target[0]?.id ?? randomUUID();
        const values = {
          editionId,
          locationId: data.toLocationId,
          productName: data.productName,
          quantity: (Number(target[0]?.quantity ?? 0) + data.quantity).toFixed(2),
          notes: data.notes ?? target[0]?.notes ?? null,
          updatedAt: new Date(),
        };
        statements.push(
          target.length
            ? database.update(inventoryItems).set(values).where(eq(inventoryItems.id, id))
            : database.insert(inventoryItems).values({ id, ...values }),
        );
        changes.push({ locationId: data.toLocationId, before: target[0] ?? null, after: values });
      }
      const movementId = randomUUID();
      statements.push(
        database.insert(inventoryMovements).values({
          id: movementId,
          editionId,
          productName: data.productName,
          fromLocationId: data.fromLocationId,
          toLocationId: data.toLocationId,
          quantity: data.quantity.toFixed(2),
          notes: data.notes,
          createdBy: member.memberId,
        }),
        database.insert(auditEvents).values({
          memberId: member.memberId,
          action: "create",
          area: "shopping",
          entity: "inventory_movement",
          entityId: movementId,
          beforeValue: null,
          afterValue: { ...data, quantity: data.quantity.toFixed(2), changes },
        }),
      );
      await database.batch(
        statements as [(typeof statements)[number], ...(typeof statements)[number][]],
      );
      return apiSuccess({ id: movementId, ...data }, 201);
    }
    const before = data.id
      ? await database
          .select()
          .from(leftovers)
          .where(and(eq(leftovers.id, data.id), eq(leftovers.editionId, editionId)))
          .limit(1)
      : await database
          .select()
          .from(leftovers)
          .where(
            and(
              eq(leftovers.editionId, editionId),
              eq(leftovers.locationId, data.locationId),
              eq(leftovers.productName, data.productName),
              data.sourceEditionId
                ? eq(leftovers.sourceEditionId, data.sourceEditionId)
                : isNull(leftovers.sourceEditionId),
            ),
          )
          .limit(1);
    if (mode && !before.length) return apiFailure("not_found", "El sobrante no existe", 404);
    const id = before[0]?.id ?? randomUUID();
    const location = await database
      .select({ id: inventoryLocations.id })
      .from(inventoryLocations)
      .where(
        and(
          eq(inventoryLocations.id, data.locationId),
          eq(inventoryLocations.editionId, editionId),
        ),
      )
      .limit(1);
    if (!location.length)
      return apiFailure("invalid_request", "La ubicación no pertenece a esta edición", 400);
    if (data.sourceEditionId) {
      const sourceEdition = await database
        .select({ id: editions.id })
        .from(editions)
        .where(eq(editions.id, data.sourceEditionId))
        .limit(1);
      if (!sourceEdition.length)
        return apiFailure("invalid_request", "La edición de origen no existe", 400);
    }
    const values = {
      editionId,
      sourceEditionId: data.sourceEditionId,
      locationId: data.locationId,
      productName: data.productName,
      quantity: (data.id
        ? data.quantity
        : Number(before[0]?.quantity ?? 0) + data.quantity
      ).toFixed(2),
      status: data.status,
      notes: data.notes,
      updatedAt: new Date(),
    };
    await database.batch([
      mode || before.length
        ? database.update(leftovers).set(values).where(eq(leftovers.id, id))
        : database.insert(leftovers).values({ id, ...values }),
      database.insert(auditEvents).values({
        memberId: member.memberId,
        action: mode || before.length ? "update" : "create",
        area: "shopping",
        entity: "leftover",
        entityId: id,
        beforeValue: before[0] ?? null,
        afterValue: values,
      }),
    ]);
    return apiSuccess({ id, ...values }, mode || before.length ? 200 : 201);
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    if (error instanceof Error && error.message === "edition_not_found")
      return apiFailure("not_found", "La edición no existe", 404);
    if (error instanceof Error && error.message === "edition_closed")
      return apiFailure("edition_closed", "La edición está cerrada", 409);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505")
      return apiFailure("already_exists", "Ya existe un registro con esos datos", 409);
    return apiFailure("inventory_unavailable", "No se ha podido guardar el inventario", 503);
  }
}
