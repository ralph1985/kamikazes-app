import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET, POST } from "./route";

describe("inventario de una edición", () => {
  it("valida la edición antes de consultar la base de datos", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/v1/editions/not-an-id/inventory"),
      { params: Promise.resolve({ editionId: "not-an-id" }) },
    );
    expect(response.status).toBe(400);
  });

  it("rechaza una mutación sin sesión", async () => {
    const editionId = "123e4567-e89b-12d3-a456-426614174000";
    const response = await POST(
      new NextRequest(`http://localhost/api/v1/editions/${editionId}/inventory`, {
        method: "POST",
        body: JSON.stringify({ type: "location", name: "Almacén" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ editionId }) },
    );
    expect(response.status).toBe(401);
  });
});
