import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  authenticateSession: vi.fn(),
  isGlobalAdmin: vi.fn(),
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

import { PATCH } from "./route";

describe("PATCH /api/v1/admin/members/:memberId", () => {
  it("rechaza un identificador inválido antes de consultar Neon", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/members/not-a-uuid", {
      method: "PATCH",
      body: JSON.stringify({
        displayName: "Rafa",
        username: "rafa",
        accountActive: true,
        assignments: [],
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ memberId: "not-a-uuid" }) });

    expect(response.status).toBe(400);
  });

  it("rechaza una petición sin sesión", async () => {
    const request = new NextRequest(
      "http://localhost/api/v1/admin/members/123e4567-e89b-12d3-a456-426614174000",
      {
        method: "PATCH",
        body: JSON.stringify({
          displayName: "Rafa",
          username: "rafa",
          accountActive: true,
          assignments: [],
        }),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ memberId: "123e4567-e89b-12d3-a456-426614174000" }),
    });

    expect(response.status).toBe(401);
  });

  it("guarda los cambios y la auditoría mediante el batch transaccional de Neon HTTP", async () => {
    const memberId = "123e4567-e89b-12d3-a456-426614174000";
    const editionId = "123e4567-e89b-12d3-a456-426614174001";
    const selectResults: unknown[][] = [
      [{ displayName: "Rafa", username: "rafa", accountActive: true }],
      [{ id: editionId }],
      [],
    ];
    let batchStatements: unknown[] | undefined;
    const database = {
      select: vi.fn(() => {
        const result = selectResults.shift() ?? [];
        const query = {
          from: vi.fn(() => query),
          innerJoin: vi.fn(() => query),
          leftJoin: vi.fn(() => query),
          limit: vi.fn(async () => result),
          then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
          where: vi.fn(() => query),
        };
        return query;
      }),
      delete: vi.fn(() => ({ where: vi.fn(() => ({})) })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn(() => ({})) })),
      })),
      insert: vi.fn(() => ({ values: vi.fn(() => ({})) })),
      batch: vi.fn(async (statements: unknown[]) => {
        batchStatements = statements;
        return [];
      }),
    };
    mocks.getDatabase.mockReturnValue(database);
    mocks.authenticateSession.mockResolvedValue({
      memberId: "123e4567-e89b-12d3-a456-426614174002",
      displayName: "Admin",
      mustChangePassword: false,
    });
    mocks.isGlobalAdmin.mockResolvedValue(true);

    const request = new NextRequest(`http://localhost/api/v1/admin/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify({
        displayName: "Rafael",
        username: "rafael",
        accountActive: true,
        assignments: [{ editionId, area: "editions", role: "editor" }],
      }),
      headers: { "content-type": "application/json", cookie: "kamikazes_session=session-token" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ memberId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { displayName: "Rafael", username: "rafael" },
    });
    expect(database.batch).toHaveBeenCalledOnce();
    expect(batchStatements?.length).toBeGreaterThan(0);
  });
});
