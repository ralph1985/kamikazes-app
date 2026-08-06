import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  auditEvents,
  cateringAttendance,
  cateringMeals,
  members,
} from "@/infrastructure/database/schema";
import {
  assertEditionOpen,
  authenticateRequest,
  canEditEditionArea,
} from "@/shared/server/authorization";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";
const attendanceSchema = z.object({
  memberId: z.uuid(),
  mealId: z.uuid(),
  status: z.enum(["yes", "no", "cancelled"]),
  paymentStatus: z.enum(["pending", "partial", "paid"]).optional(),
  paymentNotes: z.string().trim().max(500).nullable().optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ editionId: string }> },
) {
  const { editionId } = await context.params;
  if (!z.uuid().safeParse(editionId).success)
    return apiFailure("invalid_request", "La edición no es válida", 400);
  try {
    const { database, member } = await authenticateRequest(request);
    const editor = await canEditEditionArea(database, member.memberId, editionId, "catering");
    const attendance = await database
      .select({
        id: cateringAttendance.id,
        mealId: cateringAttendance.mealId,
        mealName: cateringMeals.name,
        memberId: cateringAttendance.memberId,
        displayName: members.displayName,
        status: cateringAttendance.status,
        paymentStatus: cateringAttendance.paymentStatus,
        paymentNotes: cateringAttendance.paymentNotes,
        updatedAt: cateringAttendance.updatedAt,
      })
      .from(cateringAttendance)
      .innerJoin(cateringMeals, eq(cateringMeals.id, cateringAttendance.mealId))
      .innerJoin(members, eq(members.id, cateringAttendance.memberId))
      .where(eq(cateringMeals.editionId, editionId))
      .orderBy(asc(cateringMeals.sortOrder), asc(members.displayName));
    return apiSuccess({ attendance, canEdit: editor, memberId: member.memberId });
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("catering_unavailable", "No se ha podido consultar la asistencia", 503);
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
  const parsed = attendanceSchema.safeParse(body);
  if (!parsed.success)
    return apiFailure("invalid_request", "Los datos de asistencia no son válidos", 400);
  try {
    const { database, member } = await authenticateRequest(request);
    const editor = await canEditEditionArea(database, member.memberId, editionId, "catering");
    if (!editor && parsed.data.memberId !== member.memberId)
      return apiFailure("forbidden", "Sólo puedes modificar tu propia asistencia", 403);
    try {
      await assertEditionOpen(database, editionId);
    } catch (error) {
      if (error instanceof Error && error.message === "edition_not_found")
        return apiFailure("not_found", "La edición no existe", 404);
      throw error;
    }
    const meal = await database
      .select({ id: cateringMeals.id })
      .from(cateringMeals)
      .where(and(eq(cateringMeals.id, parsed.data.mealId), eq(cateringMeals.editionId, editionId)))
      .limit(1);
    if (!meal.length)
      return apiFailure("invalid_request", "La comida no pertenece a esta edición", 400);
    const before = await database
      .select()
      .from(cateringAttendance)
      .where(
        and(
          eq(cateringAttendance.mealId, parsed.data.mealId),
          eq(cateringAttendance.memberId, parsed.data.memberId),
        ),
      )
      .limit(1);
    const id = before[0]?.id ?? randomUUID();
    const values = {
      mealId: parsed.data.mealId,
      memberId: parsed.data.memberId,
      status: parsed.data.status,
      paymentStatus: editor
        ? (parsed.data.paymentStatus ?? before[0]?.paymentStatus ?? "pending")
        : (before[0]?.paymentStatus ?? "pending"),
      paymentNotes: editor
        ? (parsed.data.paymentNotes ?? before[0]?.paymentNotes ?? null)
        : (before[0]?.paymentNotes ?? null),
      updatedAt: new Date(),
    };
    await database.batch([
      before.length
        ? database.update(cateringAttendance).set(values).where(eq(cateringAttendance.id, id))
        : database.insert(cateringAttendance).values({ id, ...values }),
      database.insert(auditEvents).values({
        memberId: member.memberId,
        action: before.length ? "update" : "create",
        area: "catering",
        entity: "catering_attendance",
        entityId: id,
        beforeValue: before[0] ?? null,
        afterValue: values,
      }),
    ]);
    return apiSuccess({ id, ...values });
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("catering_unavailable", "No se ha podido guardar la asistencia", 503);
  }
}
