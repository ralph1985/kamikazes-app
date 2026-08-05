import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "./route";

describe("asistencia de catering", () => {
  it("valida la edición antes de consultar Neon", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/v1/editions/not-an-id/catering/attendance"),
      { params: Promise.resolve({ editionId: "not-an-id" }) },
    );
    expect(response.status).toBe(400);
  });
});
