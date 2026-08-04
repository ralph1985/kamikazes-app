import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

const editionId = "123e4567-e89b-12d3-a456-426614174000";

describe("POST /api/v1/editions/:editionId/budget/movements", () => {
  it("rechaza un importe inválido antes de consultar la sesión", async () => {
    const request = new NextRequest(
      `http://localhost/api/v1/editions/${editionId}/budget/movements`,
      {
        method: "POST",
        body: JSON.stringify({
          kind: "expense",
          amount: 0,
          isPlanned: true,
          occurredAt: "2026-08-04",
          concept: "Compra",
          notes: null,
        }),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request, { params: Promise.resolve({ editionId }) });

    expect(response.status).toBe(400);
  });
});
