import { describe, expect, it } from "vitest";
import { loginInputSchema } from "./login-input";

describe("contrato de entrada de login", () => {
  it("acepta credenciales textuales, incluso una contraseña vacía para que el dominio la rechace", () => {
    expect(loginInputSchema.safeParse({ username: "jose", password: "" }).success).toBe(true);
  });

  it("rechaza tipos que no proceden del formulario", () => {
    expect(loginInputSchema.safeParse({ username: 123, password: true }).success).toBe(false);
  });
});
