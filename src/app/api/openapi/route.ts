import { NextResponse } from "next/server";

const document = {
  openapi: "3.1.0",
  info: {
    title: "Kamikazes API",
    version: "0.1.0",
    description: "API REST server-only de Kamikazes.",
  },
  servers: [{ url: "/api/v1" }],
  tags: [{ name: "system", description: "Estado del servicio" }],
  paths: {
    "/health": {
      get: {
        operationId: "getHealth",
        tags: ["system"],
        responses: {
          "200": {
            description: "Servicio disponible",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        required: ["status", "service", "version"],
        properties: {
          status: { type: "string", enum: ["ok"] },
          service: { type: "string", enum: ["kamikazes-api"] },
          version: { type: "string", enum: ["v1"] },
        },
      },
    },
  },
};

export function GET() {
  return NextResponse.json(document);
}
