import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

describe("POST /api/v1/auth/logout", () => {
  it("permite cerrar una sesión ausente de forma idempotente", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/v1/auth/logout", { method: "POST" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { loggedOut: true },
    });
  });
});
