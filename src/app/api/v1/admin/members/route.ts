import { asc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDatabase } from "@/infrastructure/database/client";
import { accounts, members, roleAssignments } from "@/infrastructure/database/schema";
import { createDatabaseGlobalAdminReader } from "@/modules/identity/adapters/database-global-admin-reader";
import { createDatabaseSessionReader } from "@/modules/identity/adapters/database-session-reader";
import { authenticateSession } from "@/modules/identity/application/session";
import { IdentityError } from "@/modules/identity/domain/identity";
import { apiFailure, apiSuccess } from "@/shared/http/api-response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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

    const rows = await database
      .select({
        id: members.id,
        displayName: members.displayName,
        username: accounts.username,
        accountActive: accounts.isActive,
        mustChangePassword: accounts.mustChangePassword,
      })
      .from(members)
      .leftJoin(accounts, eq(accounts.memberId, members.id))
      .orderBy(asc(members.displayName));

    const assignments = await database
      .select({
        memberId: roleAssignments.memberId,
        editionId: roleAssignments.editionId,
        role: roleAssignments.role,
        area: roleAssignments.area,
      })
      .from(roleAssignments);
    const rolesByMember = new Map<string, Set<string>>();
    for (const assignment of assignments) {
      const roles = rolesByMember.get(assignment.memberId) ?? new Set<string>();
      roles.add(
        assignment.role === "admin" && assignment.area === "global"
          ? "Administrador"
          : assignment.role === "editor"
            ? "Editor"
            : "Lector",
      );
      rolesByMember.set(assignment.memberId, roles);
    }

    return apiSuccess(
      rows.map((row) => ({
        ...row,
        username: row.username ?? "sin cuenta",
        accountActive: row.accountActive ?? false,
        mustChangePassword: row.mustChangePassword ?? false,
        roles: [...(rolesByMember.get(row.id) ?? new Set(["Lector"]))],
        assignments: assignments.filter((assignment) => assignment.memberId === row.id),
        protectedAdmin: row.id === actor.memberId,
      })),
    );
  } catch (error) {
    if (error instanceof IdentityError)
      return apiFailure("unauthenticated", "Necesitas iniciar sesión", 401);
    return apiFailure("members_unavailable", "No se han podido consultar los miembros", 503);
  }
}
