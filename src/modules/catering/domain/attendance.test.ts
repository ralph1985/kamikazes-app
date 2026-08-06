import { describe, expect, it } from "vitest";
import { canChangeAttendance } from "./attendance";

describe("reglas de asistencia de catering", () => {
  it("permite al miembro modificar su asistencia", () => {
    expect(canChangeAttendance("member", "member", false)).toBe(true);
  });

  it("reserva las asistencias ajenas a editores", () => {
    expect(canChangeAttendance("member", "other", false)).toBe(false);
    expect(canChangeAttendance("editor", "other", true)).toBe(true);
  });
});
