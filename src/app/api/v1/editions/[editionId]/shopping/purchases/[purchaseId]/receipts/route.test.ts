import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET, POST } from "./route";

describe("tickets de compras", () => {
  it("valida la edición y compra antes de consultar Neon", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/v1/editions/not-an-id/shopping/purchases/not-an-id/receipts",
      ),
      { params: Promise.resolve({ editionId: "not-an-id", purchaseId: "not-an-id" }) },
    );

    expect(response.status).toBe(400);
  });

  it("rechaza una subida sin sesión", async () => {
    const editionId = "123e4567-e89b-12d3-a456-426614174000";
    const purchaseId = "123e4567-e89b-12d3-a456-426614174001";
    const response = await POST(
      new NextRequest(
        `http://localhost/api/v1/editions/${editionId}/shopping/purchases/${purchaseId}/receipts`,
        { method: "POST" },
      ),
      { params: Promise.resolve({ editionId, purchaseId }) },
    );

    expect(response.status).toBe(401);
  });
});
