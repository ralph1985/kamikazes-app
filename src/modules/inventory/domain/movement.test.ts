import { describe, expect, it } from "vitest";
import { hasMovementEndpoint, usesDifferentMovementEndpoints } from "./movement";

describe("reglas de movimientos de inventario", () => {
  it("exige un origen o un destino", () => {
    expect(hasMovementEndpoint(null, null)).toBe(false);
    expect(hasMovementEndpoint("origin", null)).toBe(true);
    expect(hasMovementEndpoint(null, "destination")).toBe(true);
  });

  it("no permite mover entre la misma ubicación", () => {
    expect(usesDifferentMovementEndpoints("same", "same")).toBe(false);
    expect(usesDifferentMovementEndpoints("origin", "destination")).toBe(true);
  });
});
