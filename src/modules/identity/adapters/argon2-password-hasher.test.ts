import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { argon2PasswordHasher } from "./argon2-password-hasher";

describe("adaptador Argon2id", () => {
  it("genera un hash verificable sin guardar la contraseña", async () => {
    const hash = await argon2PasswordHasher.hash("contraseña-de-prueba");

    expect(hash).not.toContain("contraseña-de-prueba");
    await expect(argon2PasswordHasher.verify(hash, "contraseña-de-prueba")).resolves.toBe(true);
    await expect(argon2PasswordHasher.verify(hash, "otra-contraseña")).resolves.toBe(false);
  });
});
