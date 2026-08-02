import { describe, expect, it } from "vitest";
import { authenticateSession, hashSessionToken } from "./session";
import type { AuthenticatedMember, SessionReader } from "./ports";

const member: AuthenticatedMember = {
  memberId: "member-1",
  displayName: "José",
  mustChangePassword: true,
};

describe("autenticación de sesión", () => {
  it("hashea el token antes de consultarlo", async () => {
    let receivedHash = "";
    const sessions: SessionReader = {
      findActiveMemberByTokenHash: async (tokenHash) => {
        receivedHash = tokenHash;
        return member;
      },
    };

    await expect(
      authenticateSession("session-token", {
        sessions,
        clock: { now: () => new Date("2026-08-02T12:00:00.000Z") },
      }),
    ).resolves.toEqual(member);
    expect(receivedHash).toBe(hashSessionToken("session-token"));
  });

  it("rechaza la ausencia de cookie", async () => {
    const sessions: SessionReader = { findActiveMemberByTokenHash: async () => member };
    await expect(
      authenticateSession(undefined, {
        sessions,
        clock: { now: () => new Date() },
      }),
    ).rejects.toMatchObject({ code: "invalid_credentials" });
  });
});
