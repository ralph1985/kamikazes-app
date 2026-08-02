import { describe, expect, it } from "vitest";
import { createdAt, money, primaryKey, updatedAt } from "./columns";

describe("convenciones de base de datos", () => {
  it("expone constructores para IDs, instantes y dinero", () => {
    expect(primaryKey()).toBeDefined();
    expect(createdAt()).toBeDefined();
    expect(updatedAt()).toBeDefined();
    expect(money("amount")).toBeDefined();
  });
});
