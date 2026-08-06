import { del, put } from "@vercel/blob";
import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { getDatabase } from "@/infrastructure/database/client";
import {
  auditEvents,
  editions,
  shoppingPurchases,
  shoppingReceipts,
} from "@/infrastructure/database/schema";
import { authenticateRequest, canEditEditionArea } from "@/shared/server/authorization";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 10 * 1024 * 1024;

async function purchaseContext(
  database: ReturnType<typeof getDatabase>,
  editionId: string,
  purchaseId: string,
) {
  return database
    .select({ purchaseId: shoppingPurchases.id, status: editions.status })
    .from(shoppingPurchases)
    .innerJoin(editions, eq(editions.id, shoppingPurchases.editionId))
    .where(and(eq(shoppingPurchases.id, purchaseId), eq(shoppingPurchases.editionId, editionId)))
    .limit(1);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ editionId: string; purchaseId: string }> },
) {
  const { editionId, purchaseId } = await context.params;
  if (!z.uuid().safeParse(editionId).success || !z.uuid().safeParse(purchaseId).success)
    return apiFailure("invalid_request", "La compra no es válida", 400);
  try {
    const { database } = await authenticateRequest(request);
    const receipts = await database
      .select({
        id: shoppingReceipts.id,
        purchaseId: shoppingReceipts.purchaseId,
        filename: shoppingReceipts.filename,
        contentType: shoppingReceipts.contentType,
        sizeBytes: shoppingReceipts.sizeBytes,
        createdAt: shoppingReceipts.createdAt,
      })
      .from(shoppingReceipts)
      .innerJoin(shoppingPurchases, eq(shoppingPurchases.id, shoppingReceipts.purchaseId))
      .where(
        and(
          eq(shoppingReceipts.purchaseId, purchaseId),
          eq(shoppingPurchases.editionId, editionId),
        ),
      )
      .orderBy(asc(shoppingReceipts.createdAt));
    return apiSuccess({ receipts });
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("shopping_unavailable", "No se han podido consultar los tickets", 503);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ editionId: string; purchaseId: string }> },
) {
  const { editionId, purchaseId } = await context.params;
  if (!z.uuid().safeParse(editionId).success || !z.uuid().safeParse(purchaseId).success)
    return apiFailure("invalid_request", "La compra no es válida", 400);
  try {
    const { database, member } = await authenticateRequest(request);
    if (!(await canEditEditionArea(database, member.memberId, editionId, "shopping")))
      return apiFailure("forbidden", "No tienes permiso para subir tickets", 403);
    const purchase = await purchaseContext(database, editionId, purchaseId);
    if (!purchase.length)
      return apiFailure("not_found", "La compra no existe en esta edición", 404);
    if (purchase[0].status === "closed")
      return apiFailure("edition_closed", "La edición está cerrada", 409);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return apiFailure("invalid_request", "Debes adjuntar un archivo", 400);
    if (!allowedTypes.has(file.type))
      return apiFailure("invalid_request", "El ticket debe ser PDF, JPG, PNG o WEBP", 400);
    if (file.size > maxFileSize)
      return apiFailure("invalid_request", "El ticket no puede superar 10 MB", 400);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "ticket";
    const pathname = `editions/${editionId}/purchases/${purchaseId}/${randomUUID()}-${safeName}`;
    const blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type,
    });
    const receiptId = randomUUID();
    try {
      await database.batch([
        database.insert(shoppingReceipts).values({
          id: receiptId,
          purchaseId,
          pathname: blob.pathname,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          etag: blob.etag,
          uploadedBy: member.memberId,
        }),
        database.insert(auditEvents).values({
          memberId: member.memberId,
          action: "create",
          area: "shopping",
          entity: "shopping_receipt",
          entityId: receiptId,
          beforeValue: null,
          afterValue: {
            purchaseId,
            filename: file.name,
            contentType: file.type,
            sizeBytes: file.size,
          },
        }),
      ]);
    } catch (error) {
      await del(blob.pathname);
      throw error;
    }
    return apiSuccess(
      {
        id: receiptId,
        purchaseId,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      },
      201,
    );
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("shopping_unavailable", "No se ha podido guardar el ticket", 503);
  }
}
