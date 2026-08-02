import { NextResponse } from "next/server";

const document = {
  openapi: "3.1.0",
  info: { title: "Kamikazes API", version: "0.1.0" },
  paths: {
    "/api/v1/health": { get: { responses: { "200": { description: "Servicio disponible" } } } },
  },
};

export function GET() {
  return NextResponse.json(document);
}
