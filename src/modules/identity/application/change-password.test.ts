import { describe, expect, it } from "vitest";
import { changePassword } from "./change-password";
import type { PasswordChangeWriter, PasswordHasher, PasswordReader } from "./ports";
import { hashSessionToken } from "./session";

describe("cambio obligatorio de contraseña", () => {
  it("hashea la nueva contraseña y rota la sesión en un único puerto", async () => {
    let received: Parameters<PasswordChangeWriter["changePasswordAndRotateSession"]>[0] | undefined;
    const writer: PasswordChangeWriter = {
      changePasswordAndRotateSession: async (input) => {
        received = input;
        return { token: "new-session", expiresAt: input.expiresAt };
      },
    };
    const passwords: PasswordHasher = {
      hash: async (password) => `argon2id:${password}`,
      verify: async () => true,
    };
    const passwordReader: PasswordReader = {
      findHashByMemberId: async () => "current-hash",
    };
    const now = new Date("2026-08-02T12:00:00.000Z");

    const session = await changePassword(
      {
        memberId: "member-1",
        currentToken: "old-session",
        currentPassword: "actual",
        newPassword: "nueva",
      },
      { passwords, passwordReader, writer, clock: { now: () => now } },
    );

    expect(received).toMatchObject({
      memberId: "member-1",
      currentTokenHash: hashSessionToken("old-session"),
      passwordHash: "argon2id:nueva",
    });
    expect(session.token).toBe("new-session");
  });

  it("rechaza la contraseña vacía sin pedir un hash", async () => {
    const passwords: PasswordHasher = {
      hash: async () => {
        throw new Error("no debe ejecutarse");
      },
      verify: async () => true,
    };
    const writer: PasswordChangeWriter = {
      changePasswordAndRotateSession: async () => {
        throw new Error("no debe ejecutarse");
      },
    };

    await expect(
      changePassword(
        {
          memberId: "member-1",
          currentToken: "old-session",
          currentPassword: "actual",
          newPassword: "",
        },
        {
          passwords,
          passwordReader: { findHashByMemberId: async () => "hash" },
          writer,
          clock: { now: () => new Date() },
        },
      ),
    ).rejects.toMatchObject({ code: "invalid_password" });
  });

  it("rechaza la contraseña actual incorrecta antes de cambiarla", async () => {
    const writer: PasswordChangeWriter = {
      changePasswordAndRotateSession: async () => {
        throw new Error("no debe ejecutarse");
      },
    };
    const passwords: PasswordHasher = {
      hash: async () => "no debe ejecutarse",
      verify: async () => false,
    };

    await expect(
      changePassword(
        {
          memberId: "member-1",
          currentToken: "old-session",
          currentPassword: "incorrecta",
          newPassword: "nueva",
        },
        {
          passwords,
          passwordReader: { findHashByMemberId: async () => "hash" },
          writer,
          clock: { now: () => new Date() },
        },
      ),
    ).rejects.toMatchObject({ code: "invalid_password" });
  });
});
