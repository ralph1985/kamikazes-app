import { describe, expect, it } from "vitest";
import { changePassword } from "./change-password";
import type { PasswordChangeWriter, PasswordHasher } from "./ports";
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
    const now = new Date("2026-08-02T12:00:00.000Z");

    const session = await changePassword(
      { memberId: "member-1", currentToken: "old-session", newPassword: "nueva" },
      { passwords, writer, clock: { now: () => now } },
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
        { memberId: "member-1", currentToken: "old-session", newPassword: "" },
        { passwords, writer, clock: { now: () => new Date() } },
      ),
    ).rejects.toMatchObject({ code: "invalid_password" });
  });
});
