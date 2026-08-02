import { describe, expect, it } from "vitest";
import { IdentityError } from "../domain/identity";
import { login } from "./login";
import type { AccountRepository, IdentityAccount, PasswordHasher, SessionIssuer } from "./ports";

const baseAccount: IdentityAccount = {
  memberId: "member-1",
  username: "jose",
  passwordHash: "hash",
  isActive: true,
  mustChangePassword: true,
  failedLoginAttempts: 0,
  lockedAt: null,
};

function dependencies(account: IdentityAccount = baseAccount) {
  const stored = { ...account };
  const accounts: AccountRepository = {
    findByUsername: async (username) => (username === stored.username ? stored : null),
    recordFailedLogin: async (_, lockedAt) => {
      stored.failedLoginAttempts += 1;
      stored.lockedAt = lockedAt;
    },
    resetFailedLogins: async () => {
      stored.failedLoginAttempts = 0;
    },
  };
  const passwords: PasswordHasher = {
    verify: async (_, password) => password === "correcta",
    hash: async (password) => `hash:${password}`,
  };
  const sessions: SessionIssuer = {
    issue: async (_, __, expiresAt) => ({ token: "session-token", expiresAt }),
  };
  const now = new Date("2026-08-02T12:00:00.000Z");
  return { accounts, passwords, sessions, clock: { now: () => now }, stored };
}

describe("caso de uso de login", () => {
  it("normaliza el usuario y devuelve el cambio obligatorio de contraseña", async () => {
    const deps = dependencies({ ...baseAccount, username: "jose" });
    const result = await login({ username: " José ", password: "correcta" }, deps);

    expect(result.memberId).toBe("member-1");
    expect(result.mustChangePassword).toBe(true);
    expect(result.session.expiresAt.toISOString()).toBe("2026-09-01T12:00:00.000Z");
  });

  it("bloquea la cuenta en el tercer intento fallido", async () => {
    const deps = dependencies();

    await expect(login({ username: "jose", password: "incorrecta" }, deps)).rejects.toMatchObject({
      code: "invalid_credentials",
    });
    await expect(login({ username: "jose", password: "incorrecta" }, deps)).rejects.toMatchObject({
      code: "invalid_credentials",
    });
    await expect(login({ username: "jose", password: "incorrecta" }, deps)).rejects.toMatchObject({
      code: "account_locked",
    });
    expect(deps.stored.lockedAt).toBeInstanceOf(Date);
  });

  it("rechaza una contraseña vacía antes de consultar la cuenta", async () => {
    const deps = dependencies();
    await expect(login({ username: "jose", password: "" }, deps)).rejects.toBeInstanceOf(
      IdentityError,
    );
  });
});
