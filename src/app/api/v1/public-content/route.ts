import { NextResponse } from "next/server";
import { getDatabase } from "@/infrastructure/database/client";
import { createDatabasePublicContentReader } from "@/modules/public-content/adapters/database-public-content-reader";
import { readPublicContent } from "@/modules/public-content/application/read-public-content";
import { apiFailure } from "@/shared/http/api-response";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET() {
  try {
    const content = await readPublicContent(createDatabasePublicContentReader(getDatabase()));
    const response = NextResponse.json({ success: true, data: content, error: null });
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return response;
  } catch {
    return apiFailure(
      "public_content_unavailable",
      "No se ha podido cargar el contenido público",
      503,
    );
  }
}
