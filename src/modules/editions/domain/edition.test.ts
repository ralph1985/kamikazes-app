import { describe, expect, it } from "vitest";
import { canAdministratorReopenEdition, canModifyEdition } from "./edition";

describe("estado de edición", () => {
  it("permite modificar una edición abierta, no una cerrada", () => {
    expect(canModifyEdition("open")).toBe(true);
    expect(canModifyEdition("closed")).toBe(false);
  });

  it("reserva la reapertura al administrador", () => {
    expect(canAdministratorReopenEdition("admin")).toBe(true);
    expect(canAdministratorReopenEdition("editor")).toBe(false);
  });
});
