import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PUT } from "./route";

describe("PUT /api/v1/editions/:editionId/budget", () => {
  it("valida la participación antes de consultar Neon", async () => {
    const request = new NextRequest("http://localhost/api/v1/editions/not-an-id/budget", {
      method: "PUT",
      body: JSON.stringify({ memberId: "not-an-id", participating: true, rateId: null }),
      headers: { "content-type": "application/json" },
    });

    const response = await PUT(request, { params: Promise.resolve({ editionId: "not-an-id" }) });

    expect(response.status).toBe(400);
  });

  it("rechaza una petición sin sesión", async () => {
    const editionId = "123e4567-e89b-12d3-a456-426614174000";
    const memberId = "123e4567-e89b-12d3-a456-426614174001";
    const request = new NextRequest(`http://localhost/api/v1/editions/${editionId}/budget`, {
      method: "PUT",
      body: JSON.stringify({ memberId, participating: true, rateId: null }),
      headers: { "content-type": "application/json" },
    });

    const response = await PUT(request, { params: Promise.resolve({ editionId }) });

    expect(response.status).toBe(401);
  });
});
