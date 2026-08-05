import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import {
  auditEvents,
  cateringMeals,
  editions,
  roleAssignments,
} from "@/infrastructure/database/schema";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";
const mealSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(120),
  plannedPrice: z.number().finite().min(0).max(9999999999.99),
  realPrice: z.number().finite().min(0).max(9999999999.99).nullable(),
  sortOrder: z.number().int().min(0).max(9999),
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
        eq(roleAssignments.area, "catering"),
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
    const { database } = await authenticate(request);
    const meals = await database
      .select()
      .from(cateringMeals)
      .where(eq(cateringMeals.editionId, editionId))
      .orderBy(asc(cateringMeals.sortOrder), asc(cateringMeals.name));
    return apiSuccess({ meals });
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("catering_unavailable", "No se han podido consultar las comidas", 503);
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
  if (!id.success) return apiFailure("invalid_request", "La comida no es válida", 400);
  return mutate(request, context, id.data.id, body);
}
async function mutate(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
  mealId: string | null,
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
  const parsed = mealSchema.safeParse(body);
  if (!parsed.success)
    return apiFailure("invalid_request", "Los datos de la comida no son válidos", 400);
  try {
    const { database, member } = await authenticate(request);
    if (!(await canEdit(database, member.memberId, editionId)))
      return apiFailure("forbidden", "No tienes permiso para editar catering", 403);
    await assertOpen(database, editionId);
    const existing = mealId
      ? await database
          .select()
          .from(cateringMeals)
          .where(and(eq(cateringMeals.id, mealId), eq(cateringMeals.editionId, editionId)))
          .limit(1)
      : [];
    if (mealId && !existing.length)
      return apiFailure("not_found", "La comida no existe en esta edición", 404);
    const id = mealId ?? randomUUID();
    const values = {
      editionId,
      name: parsed.data.name,
      plannedPrice: parsed.data.plannedPrice.toFixed(2),
      realPrice: parsed.data.realPrice?.toFixed(2) ?? null,
      sortOrder: parsed.data.sortOrder,
      updatedAt: new Date(),
    };
    await database.batch([
      mealId
        ? database.update(cateringMeals).set(values).where(eq(cateringMeals.id, mealId))
        : database.insert(cateringMeals).values({ id, ...values }),
      database.insert(auditEvents).values({
        memberId: member.memberId,
        action: mealId ? "update" : "create",
        area: "catering",
        entity: "catering_meal",
        entityId: id,
        beforeValue: existing[0] ?? null,
        afterValue: values,
      }),
    ]);
    return apiSuccess({ id, ...values }, mealId ? 200 : 201);
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    if (error instanceof Error && error.message === "edition_not_found")
      return apiFailure("not_found", "La edición no existe", 404);
    if (error instanceof Error && error.message === "edition_closed")
      return apiFailure("edition_closed", "La edición está cerrada", 409);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505")
      return apiFailure("meal_exists", "Ya existe una comida con ese nombre", 409);
    return apiFailure("catering_unavailable", "No se ha podido guardar la comida", 503);
  }
}
