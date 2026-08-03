import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/infrastructure/database/client";
import { accounts, auditEvents, members } from "@/infrastructure/database/schema";
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

    const result = await database.transaction(async (tx) => {
      const current = await tx
        .select({
          displayName: members.displayName,
          username: accounts.username,
          accountActive: accounts.isActive,
        })
        .from(members)
        .innerJoin(accounts, eq(accounts.memberId, members.id))
        .where(eq(members.id, memberId))
        .limit(1);
      if (current.length === 0) throw new Error("member_not_found");

      const before = current[0];
      if (before.displayName !== input.data.displayName) {
        await tx
          .update(members)
          .set({ displayName: input.data.displayName, updatedAt: new Date() })
          .where(eq(members.id, memberId));
        await tx.insert(auditEvents).values({
          memberId: actor.memberId,
          action: "update",
          area: "identity",
          entity: "member",
          entityId: memberId,
          beforeValue: { displayName: before.displayName },
          afterValue: { displayName: input.data.displayName },
        });
      }
      if (before.username !== username || before.accountActive !== input.data.accountActive) {
        await tx
          .update(accounts)
          .set({ username, isActive: input.data.accountActive, updatedAt: new Date() })
          .where(eq(accounts.memberId, memberId));
        if (before.username !== username) {
          await tx.insert(auditEvents).values({
            memberId: actor.memberId,
            action: "update",
            area: "identity",
            entity: "account",
            entityId: memberId,
            beforeValue: { username: before.username },
            afterValue: { username },
          });
        }
        if (before.accountActive !== input.data.accountActive) {
          await tx.insert(auditEvents).values({
            memberId: actor.memberId,
            action: "update",
            area: "identity",
            entity: "account",
            entityId: memberId,
            beforeValue: { isActive: before.accountActive },
            afterValue: { isActive: input.data.accountActive },
          });
        }
      }
      return {
        id: memberId,
        displayName: input.data.displayName,
        username,
        accountActive: input.data.accountActive,
      };
    });
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    if (error instanceof Error && error.message === "member_not_found")
      return apiFailure("not_found", "No encontrado", 404);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return apiFailure("username_exists", "Ese nombre de usuario ya está en uso", 409);
    }
    return apiFailure("members_unavailable", "No se ha podido actualizar el miembro", 503);
  }
}
