import { asc, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import { auditEvents, publicSections, publicSocialLinks } from "@/infrastructure/database/schema";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";
import { authenticateRequest, isGlobalAdmin } from "@/shared/server/authorization";

export const runtime = "nodejs";

const publicUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "La URL debe usar http o https");

const sectionSchema = z.object({
  kind: z.literal("section"),
  id: z.uuid().optional(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(10000),
  imageUrl: publicUrlSchema.nullable(),
  sortOrder: z.number().int().min(0).max(10000),
  isVisible: z.boolean(),
});
const socialLinkSchema = z.object({
  kind: z.literal("socialLink"),
  id: z.uuid().optional(),
  label: z.string().trim().min(1).max(80),
  url: publicUrlSchema,
  sortOrder: z.number().int().min(0).max(10000),
  isActive: z.boolean(),
});
const mutationSchema = z.discriminatedUnion("kind", [sectionSchema, socialLinkSchema]);
const deleteSchema = z.object({ kind: z.enum(["section", "socialLink"]), id: z.uuid() });

async function authenticateAdmin(request: NextRequest) {
  const { database, member } = await authenticateRequest(request);
  if (!(await isGlobalAdmin(database, member.memberId))) {
    throw new Error("forbidden");
  }
  return { database, memberId: member.memberId };
}

export async function GET(request: NextRequest) {
  try {
    const { database } = await authenticateAdmin(request);
    const [sections, socialLinks] = await Promise.all([
      database.select().from(publicSections).orderBy(asc(publicSections.sortOrder)),
      database.select().from(publicSocialLinks).orderBy(asc(publicSocialLinks.sortOrder)),
    ]);
    return apiSuccess({ sections, socialLinks });
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    if (error instanceof Error && error.message === "forbidden")
      return apiFailure("not_found", "No encontrado", 404);
    return apiFailure("public_content_unavailable", "No se ha podido cargar el contenido", 503);
  }
}

export async function POST(request: NextRequest) {
  return mutate(request, "create");
}

export async function PATCH(request: NextRequest) {
  return mutate(request, "update");
}

export async function DELETE(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFailure("invalid_request", "El cuerpo debe ser JSON válido", 400);
  }
  const input = deleteSchema.safeParse(body);
  if (!input.success)
    return apiFailure("invalid_request", "El contenido a eliminar no es válido", 400);

  try {
    const { database, memberId } = await authenticateAdmin(request);
    const table = input.data.kind === "section" ? publicSections : publicSocialLinks;
    const current = await database.select().from(table).where(eq(table.id, input.data.id)).limit(1);
    if (current.length === 0) return apiFailure("not_found", "El contenido no existe", 404);
    await database.batch([
      database.delete(table).where(eq(table.id, input.data.id)),
      database.insert(auditEvents).values({
        id: randomUUID(),
        memberId,
        action: "deleted",
        area: "public-content",
        entity: input.data.kind === "section" ? "public_section" : "public_social_link",
        entityId: input.data.id,
        beforeValue: current[0],
        afterValue: null,
      }),
    ]);
    return apiSuccess({ id: input.data.id });
  } catch (error) {
    return handleAdminError(error);
  }
}

async function mutate(request: NextRequest, action: "create" | "update") {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFailure("invalid_request", "El cuerpo debe ser JSON válido", 400);
  }
  const input = mutationSchema.safeParse(body);
  if (!input.success || (action === "update" && !input.data.id))
    return apiFailure("invalid_request", "El contenido no es válido", 400);

  try {
    const { database, memberId } = await authenticateAdmin(request);
    const now = new Date();
    if (input.data.kind === "section") {
      const values = {
        title: input.data.title,
        body: input.data.body,
        imageUrl: input.data.imageUrl,
        sortOrder: input.data.sortOrder,
        isVisible: input.data.isVisible,
        updatedAt: now,
      };
      if (action === "create") {
        const id = randomUUID();
        await database.batch([
          database.insert(publicSections).values({ id, ...values }),
          audit(database, memberId, "created", "public_section", id, null, values),
        ]);
        return apiSuccess({ id, ...values }, 201);
      }
      const current = await database
        .select()
        .from(publicSections)
        .where(eq(publicSections.id, input.data.id!))
        .limit(1);
      if (current.length === 0) return apiFailure("not_found", "La sección no existe", 404);
      await database.batch([
        database.update(publicSections).set(values).where(eq(publicSections.id, input.data.id!)),
        audit(database, memberId, "updated", "public_section", input.data.id!, current[0], values),
      ]);
      return apiSuccess({ id: input.data.id, ...values });
    }

    const values = {
      label: input.data.label,
      url: input.data.url,
      sortOrder: input.data.sortOrder,
      isActive: input.data.isActive,
      updatedAt: now,
    };
    if (action === "create") {
      const id = randomUUID();
      await database.batch([
        database.insert(publicSocialLinks).values({ id, ...values }),
        audit(database, memberId, "created", "public_social_link", id, null, values),
      ]);
      return apiSuccess({ id, ...values }, 201);
    }
    const current = await database
      .select()
      .from(publicSocialLinks)
      .where(eq(publicSocialLinks.id, input.data.id!))
      .limit(1);
    if (current.length === 0) return apiFailure("not_found", "El enlace no existe", 404);
    await database.batch([
      database
        .update(publicSocialLinks)
        .set(values)
        .where(eq(publicSocialLinks.id, input.data.id!)),
      audit(
        database,
        memberId,
        "updated",
        "public_social_link",
        input.data.id!,
        current[0],
        values,
      ),
    ]);
    return apiSuccess({ id: input.data.id, ...values });
  } catch (error) {
    return handleAdminError(error);
  }
}

function audit(
  database: ReturnType<typeof getDatabase>,
  memberId: string,
  action: string,
  entity: string,
  entityId: string,
  beforeValue: unknown,
  afterValue: unknown,
): BatchItem<"pg"> {
  return database.insert(auditEvents).values({
    id: randomUUID(),
    memberId,
    action,
    area: "public-content",
    entity,
    entityId,
    beforeValue,
    afterValue,
  });
}

function handleAdminError(error: unknown) {
  if (error instanceof IdentityError)
    return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
  if (error instanceof Error && error.message === "forbidden")
    return apiFailure("not_found", "No encontrado", 404);
  return apiFailure("public_content_unavailable", "No se ha podido guardar el contenido", 503);
}
