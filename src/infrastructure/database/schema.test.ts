import { describe, expect, it } from "vitest";
import { accounts, members, sessions } from "./schema";

describe("esquema de identidad", () => {
  it("define miembros, cuentas y sesiones como tablas separadas", () => {
    expect(members).toBeDefined();
    expect(accounts).toBeDefined();
    expect(sessions).toBeDefined();
  });
});
