import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET, PATCH } from "./route";

describe("/api/v1/auth/profile", () => {
  it("rechaza la lectura sin sesión", async () => {
    const response = await GET(new NextRequest("http://localhost/api/v1/auth/profile"));
    expect(response.status).toBe(401);
  });

  it("valida el perfil antes de consultar Neon", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost/api/v1/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ displayName: "", username: 123 }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(response.status).toBe(400);
  });
});
