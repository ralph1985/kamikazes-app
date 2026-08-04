import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import {
  accounts,
  auditEvents,
  editions,
  members,
  roleAssignments,
  sessions,
} from "@/infrastructure/database/schema";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { normalizeUsername, IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

const updateInputSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  username: z.string().trim().min(1).max(60),
  accountActive: z.boolean(),
  assignments: z
    .array(
      z.object({
        editionId: z.uuid().nullable(),
        area: z.enum(["editions", "budget", "shopping", "catering", "global"]),
        role: z.enum(["admin", "editor", "reader"]),
      }),
    )
    .max(40),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await context.params;
  if (!z.uuid().safeParse(memberId).success)
    return apiFailure("invalid_request", "El miembro no es válido", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiFailure("invalid_request", "El cuerpo debe ser JSON válido", 400);
  }
  const input = updateInputSchema.safeParse(body);
  if (!input.success)
    return apiFailure("invalid_request", "Los datos del miembro no son válidos", 400);
  const username = normalizeUsername(input.data.username);
  if (!/^[a-z0-9]+$/.test(username)) {
    return apiFailure(
      "invalid_request",
      "El nombre de usuario sólo puede contener letras y números",
      400,
    );
  }
  const token = request.cookies.get("kamikazes_session")?.value;
  if (!token) return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);

  try {
    const database = getDatabase();
    const actor = await authenticateSession(token, {
      sessions: createDatabaseSessionReader(database),
      clock: { now: () => new Date() },
    });
    if (!(await createDatabaseGlobalAdminReader(database).isGlobalAdmin(actor.memberId))) {
      return apiFailure("not_found", "No encontrado", 404);
    }
    if (actor.memberId === memberId && !input.data.accountActive) {
      return apiFailure("invalid_request", "No puedes desactivar tu propia cuenta", 409);
    }

    const current = await database
      .select({
        displayName: members.displayName,
        username: accounts.username,
        accountActive: accounts.isActive,
      })
      .from(members)
      .leftJoin(accounts, eq(accounts.memberId, members.id))
      .where(eq(members.id, memberId))
      .limit(1);
    if (current.length === 0) throw new Error("member_not_found");
    const before = current[0];
    if (!before.username) throw new Error("account_missing");

    const requestedGlobalAdmin = input.data.assignments.some(
      (assignment) =>
        assignment.area === "global" &&
        assignment.role === "admin" &&
        assignment.editionId === null,
    );
    if (actor.memberId === memberId && !requestedGlobalAdmin) {
      throw new Error("last_admin_protection");
    }
    if (
      input.data.assignments.some(
        (assignment) =>
          assignment.area === "global" &&
          (assignment.role !== "admin" || assignment.editionId !== null),
      )
    )
      throw new Error("invalid_assignment");
    if (
      input.data.assignments.some(
        (assignment) =>
          (assignment.area !== "global" &&
            assignment.role !== "editor" &&
            assignment.role !== "reader") ||
          assignment.editionId === null,
      )
    )
      throw new Error("invalid_assignment");
    const availableEditionIds = new Set(
      (await database.select({ id: editions.id }).from(editions)).map((edition) => edition.id),
    );
    if (
      input.data.assignments.some(
        (assignment) =>
          assignment.editionId !== null && !availableEditionIds.has(assignment.editionId),
      )
    )
      throw new Error("invalid_assignment");
    const beforeAssignments = await database
      .select({
        id: roleAssignments.id,
        editionId: roleAssignments.editionId,
        area: roleAssignments.area,
        role: roleAssignments.role,
      })
      .from(roleAssignments)
      .where(eq(roleAssignments.memberId, memberId));

    const statements: BatchItem<"pg">[] = [
      database.delete(roleAssignments).where(eq(roleAssignments.memberId, memberId)),
    ];
    const now = new Date();
    if (before.displayName !== input.data.displayName) {
      statements.push(
        database
          .update(members)
          .set({ displayName: input.data.displayName, updatedAt: now })
          .where(eq(members.id, memberId)),
        database.insert(auditEvents).values({
          memberId: actor.memberId,
          action: "update",
          area: "identity",
          entity: "member",
          entityId: memberId,
          beforeValue: { displayName: before.displayName },
          afterValue: { displayName: input.data.displayName },
        }),
      );
    }
    if (before.username !== username || before.accountActive !== input.data.accountActive) {
      statements.push(
        database
          .update(accounts)
          .set({ username, isActive: input.data.accountActive, updatedAt: now })
          .where(eq(accounts.memberId, memberId)),
      );
      if (before.username !== username) {
        statements.push(
          database.insert(auditEvents).values({
            memberId: actor.memberId,
            action: "update",
            area: "identity",
            entity: "account",
            entityId: memberId,
            beforeValue: { username: before.username },
            afterValue: { username },
          }),
        );
      }
      if (before.accountActive !== input.data.accountActive) {
        statements.push(
          database.insert(auditEvents).values({
            memberId: actor.memberId,
            action: "update",
            area: "identity",
            entity: "account",
            entityId: memberId,
            beforeValue: { isActive: before.accountActive },
            afterValue: { isActive: input.data.accountActive },
          }),
        );
        if (!input.data.accountActive) {
          statements.push(
            database
              .update(sessions)
              .set({ revokedAt: now })
              .where(eq(sessions.memberId, memberId)),
          );
        }
      }
    }
    if (input.data.assignments.length > 0) {
      statements.push(
        database
          .insert(roleAssignments)
          .values(input.data.assignments.map((assignment) => ({ ...assignment, memberId }))),
      );
    }
    const beforeRoleKeys = new Set(
      beforeAssignments.map(
        (assignment) => `${assignment.editionId ?? "global"}:${assignment.area}:${assignment.role}`,
      ),
    );
    const afterRoleKeys = new Set(
      input.data.assignments.map(
        (assignment) => `${assignment.editionId ?? "global"}:${assignment.area}:${assignment.role}`,
      ),
    );
    for (const key of beforeRoleKeys) {
      if (!afterRoleKeys.has(key))
        statements.push(
          database.insert(auditEvents).values({
            memberId: actor.memberId,
            action: "update",
            area: "identity",
            entity: "role_assignment",
            entityId: memberId,
            beforeValue: { assignment: key },
            afterValue: null,
          }),
        );
    }
    for (const key of afterRoleKeys) {
      if (!beforeRoleKeys.has(key))
        statements.push(
          database.insert(auditEvents).values({
            memberId: actor.memberId,
            action: "update",
            area: "identity",
            entity: "role_assignment",
            entityId: memberId,
            beforeValue: null,
            afterValue: { assignment: key },
          }),
        );
    }
    await database.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
    const result = {
      id: memberId,
      displayName: input.data.displayName,
      username,
      accountActive: input.data.accountActive,
      assignments: input.data.assignments,
    };
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    if (error instanceof Error && error.message === "member_not_found")
      return apiFailure("not_found", "No encontrado", 404);
    if (error instanceof Error && error.message === "account_missing")
      return apiFailure("account_missing", "El miembro no tiene una cuenta provisionada", 409);
    if (error instanceof Error && error.message === "last_admin_protection")
      return apiFailure(
        "last_admin_protection",
        "No puedes quitarte el último acceso de administrador",
        409,
      );
    if (error instanceof Error && error.message === "invalid_assignment")
      return apiFailure("invalid_assignment", "La asignación de permisos no es válida", 400);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return apiFailure("username_exists", "Ese nombre de usuario ya está en uso", 409);
    }
    return apiFailure("members_unavailable", "No se ha podido actualizar el miembro", 503);
  }
}
