import { describe, expect, it } from "vitest";
import { prepareAttendanceUpdate } from "./prepare-attendance-update";

describe("preparación de asistencia", () => {
  const base = {
    id: "attendance",
    mealId: "meal",
    memberId: "member",
    status: "yes" as const,
    updatedAt: new Date("2026-01-01"),
  };

  it("conserva el pago cuando un miembro cambia sólo su asistencia", () => {
    expect(
      prepareAttendanceUpdate(base, false, {
        id: "attendance",
        paymentStatus: "paid",
        paymentNotes: "ok",
      }).values,
    ).toMatchObject({
      status: "yes",
      paymentStatus: "paid",
      paymentNotes: "ok",
    });
  });

  it("permite a un editor actualizar el estado de pago", () => {
    expect(
      prepareAttendanceUpdate({ ...base, paymentStatus: "partial" }, true).values.paymentStatus,
    ).toBe("partial");
  });
});
