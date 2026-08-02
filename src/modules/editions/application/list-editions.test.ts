import { describe, expect, it, vi } from "vitest";
import { listEditions } from "./list-editions";

describe("listar ediciones", () => {
  it("delega la lectura en el puerto de ediciones", async () => {
    const editions = [
      { id: "edition-2026", year: 2026, status: "open" as const },
      { id: "edition-2025", year: 2025, status: "closed" as const },
    ];
    const reader = { list: vi.fn().mockResolvedValue(editions) };

    await expect(listEditions(reader)).resolves.toEqual(editions);
    expect(reader.list).toHaveBeenCalledOnce();
  });
});
