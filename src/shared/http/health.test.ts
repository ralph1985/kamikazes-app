import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "./health";

describe("health API contract", () => {
  it("accepts the documented response", () => {
    expect(
      healthResponseSchema.parse({ status: "ok", service: "kamikazes-api", version: "v1" }),
    ).toEqual({ status: "ok", service: "kamikazes-api", version: "v1" });
  });

  it("rejects an undocumented status", () => {
    expect(() => healthResponseSchema.parse({ status: "healthy" })).toThrow();
  });
});
