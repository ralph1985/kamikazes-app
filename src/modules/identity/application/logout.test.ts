import { describe, expect, it } from "vitest";
import { logout, logoutAll } from "./logout";
import { hashSessionToken } from "./session";

describe("cierre de sesión", () => {
  it("revoca el token actual mediante el puerto de sesiones", async () => {
    let received: { tokenHash: string; now: Date } | undefined;
    const now = new Date("2026-08-02T12:00:00.000Z");

    await logout("session-token", {
      sessions: {
        revoke: async (tokenHash, receivedNow) => {
          received = { tokenHash, now: receivedNow };
        },
        revokeAll: async () => {},
      },
      clock: { now: () => now },
    });

    expect(received).toEqual({ tokenHash: hashSessionToken("session-token"), now });
  });

  it("no consulta el puerto si no hay sesión", async () => {
    const revoke = async () => {
      throw new Error("no debe ejecutarse");
    };

    await expect(
      logout(undefined, {
        sessions: { revoke, revokeAll: async () => {} },
        clock: { now: () => new Date() },
      }),
    ).resolves.toBeUndefined();
  });

  it("revoca todas las sesiones del miembro", async () => {
    let received: { memberId: string; now: Date } | undefined;
    const now = new Date("2026-08-04T12:00:00.000Z");

    await logoutAll("member-1", {
      sessions: {
        revoke: async () => {},
        revokeAll: async (memberId, receivedNow) => {
          received = { memberId, now: receivedNow };
        },
      },
      clock: { now: () => now },
    });

    expect(received).toEqual({ memberId: "member-1", now });
  });
});
