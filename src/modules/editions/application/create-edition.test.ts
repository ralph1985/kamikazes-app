import { describe, expect, it, vi } from "vitest";
import { createEdition } from "./create-edition";

describe("crear edición", () => {
  it("crea una edición abierta y pasa el autor al puerto", async () => {
    const now = new Date("2026-08-03T12:00:00.000Z");
    const creator = {
      create: vi.fn().mockResolvedValue({ id: "edition-2026", year: 2026, status: "open" }),
    };

    await expect(
      createEdition(
        { id: "edition-2026", year: 2026, memberId: "member-1" },
        { creator, clock: { now: () => now } },
      ),
    ).resolves.toEqual({ id: "edition-2026", year: 2026, status: "open" });
    expect(creator.create).toHaveBeenCalledWith({
      id: "edition-2026",
      year: 2026,
      memberId: "member-1",
      now,
    });
  });

  it("rechaza años fuera del rango antes de tocar el puerto", async () => {
    const creator = { create: vi.fn() };

    await expect(
      createEdition(
        { id: "edition-invalid", year: 2201, memberId: "member-1" },
        { creator, clock: { now: () => new Date() } },
      ),
    ).rejects.toThrow(/año/i);
    expect(creator.create).not.toHaveBeenCalled();
  });
});
