import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

const editionId = "123e4567-e89b-12d3-a456-426614174000";

describe("POST /api/v1/editions/:editionId/budget/balances", () => {
  it("valida que el saldo no sea cero", async () => {
    const request = new NextRequest(
      `http://localhost/api/v1/editions/${editionId}/budget/balances`,
      {
        method: "POST",
        body: JSON.stringify({
          amount: 0,
          concept: "Ajuste",
          originYear: null,
          originEditionId: null,
        }),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request, { params: Promise.resolve({ editionId }) });

    expect(response.status).toBe(400);
  });
});
