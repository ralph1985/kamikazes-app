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

import { GET } from "./route";

describe("GET /api/v1/admin/public-content", () => {
  it("rechaza una petición sin sesión", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/public-content");

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("oculta el contenido administrativo a un miembro no administrador", async () => {
    mocks.authenticateSession.mockResolvedValue({ memberId: "member-1" });
    mocks.isGlobalAdmin.mockResolvedValue(false);
    mocks.getDatabase.mockReturnValue({});

    const request = new NextRequest("http://localhost/api/v1/admin/public-content", {
      headers: { cookie: "kamikazes_session=token" },
    });

    const response = await GET(request);

    expect(response.status).toBe(404);
  });
});
