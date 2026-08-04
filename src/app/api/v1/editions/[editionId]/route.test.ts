import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  authenticateSession: vi.fn(),
  isGlobalAdmin: vi.fn(),
  change: vi.fn(),
}));

vi.mock("@/infrastructure/database/client", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/modules/identity/application/session", () => ({
  authenticateSession: mocks.authenticateSession,
}));
vi.mock("@/modules/identity/adapters/database-session-reader", () => ({
  createDatabaseSessionReader: vi.fn(() => ({})),
}));
vi.mock("@/modules/identity/adapters/database-global-admin-reader", () => ({
  createDatabaseGlobalAdminReader: vi.fn(() => ({ isGlobalAdmin: mocks.isGlobalAdmin })),
}));
vi.mock("@/modules/editions/adapters/database-edition-status-changer", () => ({
  createDatabaseEditionStatusChanger: vi.fn(() => ({ change: mocks.change })),
}));

import { PATCH } from "./route";

const editionId = "123e4567-e89b-12d3-a456-426614174000";

describe("PATCH /api/v1/editions/:editionId", () => {
  it("rechaza una petición sin sesión", async () => {
    const request = new NextRequest(`http://localhost/api/v1/editions/${editionId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "closed" }),
      headers: { "content-type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ editionId }) });

    expect(response.status).toBe(401);
  });

  it("rechaza el cambio de estado a un miembro que no es administrador", async () => {
    mocks.authenticateSession.mockResolvedValue({ memberId: "member-1" });
    mocks.isGlobalAdmin.mockResolvedValue(false);

    const request = new NextRequest(`http://localhost/api/v1/editions/${editionId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "closed" }),
      headers: { "content-type": "application/json", cookie: "kamikazes_session=token" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ editionId }) });

    expect(response.status).toBe(403);
  });

  it("cambia el estado mediante el caso de uso para un administrador", async () => {
    const result = { id: editionId, year: 2026, status: "closed" as const };
    const query = {
      from: vi.fn(() => query),
      where: vi.fn(() => query),
      limit: vi.fn(async () => [{ id: editionId, year: 2026, status: "open" }]),
    };
    mocks.getDatabase.mockReturnValue({ select: vi.fn(() => query) });
    mocks.authenticateSession.mockResolvedValue({ memberId: "admin-1" });
    mocks.isGlobalAdmin.mockResolvedValue(true);
    mocks.change.mockResolvedValue(result);

    const request = new NextRequest(`http://localhost/api/v1/editions/${editionId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "closed" }),
      headers: { "content-type": "application/json", cookie: "kamikazes_session=token" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ editionId }) });

    expect(response.status).toBe(200);
    expect(mocks.change).toHaveBeenCalledWith({
      id: editionId,
      year: 2026,
      currentStatus: "open",
      status: "closed",
      memberId: "admin-1",
      now: expect.any(Date),
    });
  });
});
