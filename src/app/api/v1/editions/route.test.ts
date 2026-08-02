import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "./route";

describe("GET /api/v1/editions", () => {
  it("rechaza una petición sin sesión antes de consultar Neon", async () => {
    const request = new NextRequest("http://localhost/api/v1/editions");

    const response = await GET(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "unauthenticated" },
    });
  });
});
