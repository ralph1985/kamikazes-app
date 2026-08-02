import { describe, expect, it } from "vitest";
import { canEdit, canRead, type RoleAssignment } from "./authorization";

const assignments: RoleAssignment[] = [
  { memberId: "admin", editionId: null, area: "global", role: "admin" },
  { memberId: "editor", editionId: "2026", area: "budget", role: "editor" },
  { memberId: "reader", editionId: "2026", area: "budget", role: "reader" },
];

describe("autorización por miembro, edición y área", () => {
  it("da acceso global de lectura y edición al administrador", () => {
    expect(canRead(assignments, "admin", "2026", "budget")).toBe(true);
    expect(canEdit(assignments, "admin", "2026", "budget")).toBe(true);
  });

  it("permite leer al lector pero no modificar", () => {
    expect(canRead(assignments, "reader", "2026", "budget")).toBe(true);
    expect(canEdit(assignments, "reader", "2026", "budget")).toBe(false);
  });

  it("no extiende un permiso de edición a otra área o año", () => {
    expect(canRead(assignments, "editor", "2025", "budget")).toBe(false);
    expect(canEdit(assignments, "editor", "2026", "shopping")).toBe(false);
  });
});
