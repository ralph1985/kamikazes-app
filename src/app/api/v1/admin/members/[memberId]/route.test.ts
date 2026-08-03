import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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
});
