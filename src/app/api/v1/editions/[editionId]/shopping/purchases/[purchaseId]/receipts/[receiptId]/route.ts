import { del, get } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import {
  auditEvents,
  editions,
  roleAssignments,
  shoppingPurchases,
  shoppingReceipts,
} from "@/infrastructure/database/schema";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

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

async function receiptContext(
  database: ReturnType<typeof getDatabase>,
  editionId: string,
  purchaseId: string,
  receiptId: string,
) {
  return database
    .select({
      id: shoppingReceipts.id,
      pathname: shoppingReceipts.pathname,
      purchaseId: shoppingReceipts.purchaseId,
      filename: shoppingReceipts.filename,
      contentType: shoppingReceipts.contentType,
      status: editions.status,
    })
    .from(shoppingReceipts)
    .innerJoin(shoppingPurchases, eq(shoppingPurchases.id, shoppingReceipts.purchaseId))
    .innerJoin(editions, eq(editions.id, shoppingPurchases.editionId))
    .where(
      and(
        eq(shoppingReceipts.id, receiptId),
        eq(shoppingReceipts.purchaseId, purchaseId),
        eq(shoppingPurchases.editionId, editionId),
      ),
    )
    .limit(1);
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ editionId: string; purchaseId: string; receiptId: string }> },
) {
  const { editionId, purchaseId, receiptId } = await context.params;
  if (![editionId, purchaseId, receiptId].every((value) => z.uuid().safeParse(value).success))
    return apiFailure("invalid_request", "El ticket no es válido", 400);
  try {
    const { database } = await authenticate(_request);
    const receipt = await receiptContext(database, editionId, purchaseId, receiptId);
    if (!receipt.length) return apiFailure("not_found", "El ticket no existe", 404);
    const blob = await get(receipt[0].pathname, { access: "private" });
    if (!blob || blob.statusCode !== 200)
      return apiFailure("not_found", "El archivo del ticket no está disponible", 404);
    return new Response(blob.stream, {
      headers: {
        "content-type": receipt[0].contentType,
        "content-disposition": `inline; filename="${receipt[0].filename.replace(/"/g, "")}"`,
        etag: blob.blob.etag,
      },
    });
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("shopping_unavailable", "No se ha podido leer el ticket", 503);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ editionId: string; purchaseId: string; receiptId: string }> },
) {
  const { editionId, purchaseId, receiptId } = await context.params;
  if (![editionId, purchaseId, receiptId].every((value) => z.uuid().safeParse(value).success))
    return apiFailure("invalid_request", "El ticket no es válido", 400);
  try {
    const { database, member } = await authenticate(_request);
    if (!(await canEdit(database, member.memberId, editionId)))
      return apiFailure("forbidden", "No tienes permiso para eliminar tickets", 403);
    const receipt = await receiptContext(database, editionId, purchaseId, receiptId);
    if (!receipt.length) return apiFailure("not_found", "El ticket no existe", 404);
    if (receipt[0].status === "closed")
      return apiFailure("edition_closed", "La edición está cerrada", 409);
    await del(receipt[0].pathname);
    await database.batch([
      database.delete(shoppingReceipts).where(eq(shoppingReceipts.id, receiptId)),
      database.insert(auditEvents).values({
        memberId: member.memberId,
        action: "delete",
        area: "shopping",
        entity: "shopping_receipt",
        entityId: receiptId,
        beforeValue: receipt[0],
        afterValue: null,
      }),
    ]);
    return apiSuccess({ id: receiptId });
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("shopping_unavailable", "No se ha podido eliminar el ticket", 503);
  }
}
