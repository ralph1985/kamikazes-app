export type AuthorizationRole = "admin" | "editor" | "reader";
export type AuthorizationArea =
  "identity" | "editions" | "budget" | "shopping" | "catering" | "public-content" | "audit";

export type RoleAssignment = {
  memberId: string;
  editionId: string | null;
  area: "global" | AuthorizationArea;
  role: AuthorizationRole;
};

export function canRead(
  assignments: RoleAssignment[],
  memberId: string,
  editionId: string,
  area: AuthorizationArea,
): boolean {
  return assignments.some(
    (assignment) =>
      assignment.memberId === memberId &&
      ((assignment.role === "admin" && assignment.area === "global") ||
        (assignment.editionId === editionId &&
          assignment.area === area &&
          (assignment.role === "editor" || assignment.role === "reader"))),
  );
}

export function canEdit(
  assignments: RoleAssignment[],
  memberId: string,
  editionId: string,
  area: AuthorizationArea,
): boolean {
  return assignments.some(
    (assignment) =>
      assignment.memberId === memberId &&
      ((assignment.role === "admin" && assignment.area === "global") ||
        (assignment.editionId === editionId &&
          assignment.area === area &&
          assignment.role === "editor")),
  );
}
