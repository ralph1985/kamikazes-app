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
    "/auth/login": {
      post: {
        operationId: "login",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/LoginInput" } },
          },
        },
        responses: {
          "200": { description: "Sesión creada" },
          "400": { description: "Entrada inválida" },
          "401": { description: "Credenciales inválidas" },
          "423": { description: "Cuenta bloqueada" },
          "503": { description: "Autenticación no configurada" },
        },
      },
    },
    "/auth/me": {
      get: {
        operationId: "getAuthenticatedMember",
        responses: {
          "200": { description: "Miembro autenticado" },
          "401": { description: "Sesión ausente o inválida" },
          "503": { description: "Autenticación no configurada" },
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
      LoginInput: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string" },
          password: { type: "string", format: "password" },
        },
      },
    },
  },
};

export function GET() {
  return NextResponse.json(document);
}
