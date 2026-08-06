import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { auditEvents, editions, shoppingCategories } from "@/infrastructure/database/schema";
import { authenticateRequest, canEditEditionArea } from "@/shared/server/authorization";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

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
  const input = categoryInputSchema.safeParse(body);
  if (!input.success) return apiFailure("invalid_request", "La categoría no es válida", 400);

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
      .select({ id: shoppingCategories.id, name: shoppingCategories.name })
      .from(shoppingCategories)
      .where(
        and(
          eq(shoppingCategories.editionId, editionId),
          eq(shoppingCategories.name, input.data.name),
        ),
      )
      .limit(1);
    if (existing[0]) return apiSuccess(existing[0]);

    const category = { id: randomUUID(), editionId, name: input.data.name };
    await database.batch([
      database.insert(shoppingCategories).values(category),
      database.insert(auditEvents).values({
        memberId: member.memberId,
        action: "create",
        area: "shopping",
        entity: "shopping_category",
        entityId: category.id,
        beforeValue: null,
        afterValue: category,
      }),
    ] as never);
    return apiSuccess({ id: category.id, name: category.name }, 201);
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("shopping_unavailable", "No se ha podido crear la categoría", 503);
  }
}
