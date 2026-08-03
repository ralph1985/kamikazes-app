import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PUT } from "./route";

describe("PUT /api/v1/editions/:editionId/participants", () => {
  it("valida el participante antes de consultar Neon", async () => {
    const request = new NextRequest(
      "http://localhost/api/v1/editions/123e4567-e89b-12d3-a456-426614174000/participants",
      {
        method: "PUT",
        body: JSON.stringify({ memberId: "not-a-uuid", participating: true }),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ editionId: "123e4567-e89b-12d3-a456-426614174000" }),
    });

    expect(response.status).toBe(400);
  });

  it("rechaza una petición sin sesión", async () => {
    const request = new NextRequest(
      "http://localhost/api/v1/editions/123e4567-e89b-12d3-a456-426614174000/participants",
      {
        method: "PUT",
        body: JSON.stringify({
          memberId: "123e4567-e89b-12d3-a456-426614174001",
          participating: true,
        }),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ editionId: "123e4567-e89b-12d3-a456-426614174000" }),
    });

    expect(response.status).toBe(401);
  });
});
