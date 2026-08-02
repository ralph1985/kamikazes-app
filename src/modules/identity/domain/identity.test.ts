import { describe, expect, it } from "vitest";
import { assertPasswordNotEmpty, normalizeUsername } from "./identity";

describe("reglas de identidad", () => {
  it("normaliza minúsculas, tildes y espacios", () => {
    expect(normalizeUsername("  José Pérez ")).toBe("joseperez");
  });

  it("no impone una longitud mínima, pero rechaza vacío", () => {
    expect(() => assertPasswordNotEmpty("a")).not.toThrow();
    expect(() => assertPasswordNotEmpty("")).toThrow();
  });
});
