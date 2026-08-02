import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./login/route";

describe("POST /api/v1/auth/login", () => {
  it("devuelve contrato uniforme para JSON inválido", async () => {
    const request = new NextRequest("http://localhost/api/v1/auth/login", {
      method: "POST",
      body: "no-json",
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      data: null,
      error: { code: "invalid_request", message: "El cuerpo debe ser JSON válido" },
    });
  });

  it("valida el contrato antes de intentar acceder a Neon", async () => {
    const request = new NextRequest("http://localhost/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: 123, password: true }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
