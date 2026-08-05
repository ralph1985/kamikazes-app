import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import {
  auditEvents,
  editions,
  inventoryItems,
  inventoryLocations,
  inventoryMovements,
  leftovers,
  roleAssignments,
} from "@/infrastructure/database/schema";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
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
const inputSchema = z.discriminatedUnion("type", [locationSchema, stockSchema, leftoverSchema]);

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
        eq(roleAssignments.area, "shopping"),
        eq(roleAssignments.role, "editor"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
async function assertOpen(database: ReturnType<typeof getDatabase>, editionId: string) {
  const rows = await database
    .select({ status: editions.status })
    .from(editions)
    .where(eq(editions.id, editionId))
    .limit(1);
  if (!rows.length) throw new Error("edition_not_found");
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
    const { database, member } = await authenticate(request);
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
      canEdit: await canEdit(database, member.memberId, editionId),
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
    const { database, member } = await authenticate(request);
    if (!(await canEdit(database, member.memberId, editionId)))
      return apiFailure("forbidden", "No tienes permiso para editar inventario", 403);
    await assertOpen(database, editionId);
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
      const id = existing[0]?.id ?? randomUUID();
      const values = {
        editionId,
        locationId: data.locationId,
        productName: data.productName,
        quantity: data.quantity.toFixed(2),
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
          quantity: data.quantity.toFixed(2),
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
    const id = data.id ?? randomUUID();
    const before = data.id
      ? await database
          .select()
          .from(leftovers)
          .where(and(eq(leftovers.id, data.id), eq(leftovers.editionId, editionId)))
          .limit(1)
      : [];
    if (mode && !before.length) return apiFailure("not_found", "El sobrante no existe", 404);
    const values = {
      editionId,
      sourceEditionId: data.sourceEditionId,
      locationId: data.locationId,
      productName: data.productName,
      quantity: data.quantity.toFixed(2),
      status: data.status,
      notes: data.notes,
      updatedAt: new Date(),
    };
    await database.batch([
      mode
        ? database.update(leftovers).set(values).where(eq(leftovers.id, id))
        : database.insert(leftovers).values({ id, ...values }),
      database.insert(auditEvents).values({
        memberId: member.memberId,
        action: mode ? "update" : "create",
        area: "shopping",
        entity: "leftover",
        entityId: id,
        beforeValue: before[0] ?? null,
        afterValue: values,
      }),
    ]);
    return apiSuccess({ id, ...values }, mode ? 200 : 201);
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
