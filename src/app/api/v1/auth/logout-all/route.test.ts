import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

describe("POST /api/v1/auth/logout-all", () => {
  it("rechaza cerrar sesiones sin sesión actual", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/v1/auth/logout-all", { method: "POST" }),
    );
    expect(response.status).toBe(401);
  });
});
