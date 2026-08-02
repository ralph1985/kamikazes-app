import { NextResponse } from "next/server";
import { healthResponseSchema } from "@/shared/http/health";

export function GET() {
  const response = healthResponseSchema.parse({
    status: "ok",
    service: "kamikazes-api",
    version: "v1",
  });

  return NextResponse.json(response);
}
