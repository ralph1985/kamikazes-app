import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

describe("POST /api/v1/editions", () => {
  it("valida el año antes de consultar Neon", async () => {
    const request = new NextRequest("http://localhost/api/v1/editions", {
      method: "POST",
      body: JSON.stringify({ year: "2026" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("rechaza una petición sin sesión", async () => {
    const request = new NextRequest("http://localhost/api/v1/editions", {
      method: "POST",
      body: JSON.stringify({ year: 2026 }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});
