import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

describe("POST /api/v1/auth/change-password", () => {
  it("rechaza el cambio sin sesión", async () => {
    const request = new NextRequest("http://localhost/api/v1/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ newPassword: "nueva" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("valida el cuerpo antes de consultar Neon", async () => {
    const request = new NextRequest("http://localhost/api/v1/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ newPassword: 123 }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
