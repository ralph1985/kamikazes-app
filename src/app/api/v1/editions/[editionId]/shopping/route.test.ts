import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DELETE, GET, POST, PUT } from "./route";
import { POST as createCategory } from "./categories/route";
import { POST as createStore } from "./stores/route";
import { POST as copyShopping } from "../shopping/copy/route";

describe("/api/v1/editions/:editionId/shopping", () => {
  it("valida la edición antes de consultar Neon", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/v1/editions/not-an-id/shopping"),
      { params: Promise.resolve({ editionId: "not-an-id" }) },
    );

    expect(response.status).toBe(400);
  });

  it("rechaza una creación sin sesión", async () => {
    const editionId = "123e4567-e89b-12d3-a456-426614174000";
    const response = await POST(
      new NextRequest(`http://localhost/api/v1/editions/${editionId}/shopping`, {
        method: "POST",
        body: JSON.stringify({ description: "Pan" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ editionId }) },
    );

    expect(response.status).toBe(401);
  });

  it("valida el producto antes de borrar", async () => {
    const editionId = "123e4567-e89b-12d3-a456-426614174000";
    const response = await DELETE(
      new NextRequest(`http://localhost/api/v1/editions/${editionId}/shopping`, {
        method: "DELETE",
        body: JSON.stringify({ id: "not-an-id" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ editionId }) },
    );

    expect(response.status).toBe(400);
  });

  it("valida la categoría antes de consultar Neon", async () => {
    const editionId = "123e4567-e89b-12d3-a456-426614174000";
    const response = await createCategory(
      new NextRequest(`http://localhost/api/v1/editions/${editionId}/shopping/categories`, {
        method: "POST",
        body: JSON.stringify({ name: "" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ editionId }) },
    );

    expect(response.status).toBe(400);
  });

  it("valida la tienda antes de consultar Neon", async () => {
    const editionId = "123e4567-e89b-12d3-a456-426614174000";
    const response = await createStore(
      new NextRequest(`http://localhost/api/v1/editions/${editionId}/shopping/stores`, {
        method: "POST",
        body: JSON.stringify({ name: "" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ editionId }) },
    );

    expect(response.status).toBe(400);
  });

  it("rechaza preferencias inválidas antes de consultar Neon", async () => {
    const editionId = "123e4567-e89b-12d3-a456-426614174000";
    const response = await PUT(
      new NextRequest(`http://localhost/api/v1/editions/${editionId}/shopping`, {
        method: "PUT",
        body: JSON.stringify({
          scope: "general",
          groupBy: "invalid",
          sortBy: "description",
          sortDirection: "asc",
        }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ editionId }) },
    );

    expect(response.status).toBe(400);
  });

  it("valida el origen de una copia antes de consultar Neon", async () => {
    const editionId = "123e4567-e89b-12d3-a456-426614174000";
    const response = await copyShopping(
      new NextRequest(`http://localhost/api/v1/editions/${editionId}/shopping/copy`, {
        method: "POST",
        body: JSON.stringify({ sourceEditionId: editionId }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ editionId }) },
    );

    expect(response.status).toBe(400);
  });
});
