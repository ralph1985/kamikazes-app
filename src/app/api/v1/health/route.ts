import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "kamikazes-api", version: "v1" });
}
