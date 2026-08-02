import { describe, expect, it } from "vitest";
import { identityModule } from "./module";

describe("módulos de Kamikazes", () => {
  it("mantiene identidad como límite de dominio independiente", () => {
    expect(identityModule).toBe("identity");
  });
});
