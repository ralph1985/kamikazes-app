import { describe, expect, it, vi } from "vitest";
import { changeEditionStatus } from "./change-edition-status";

describe("cambiar estado de edición", () => {
  it("permite cerrar una edición abierta", async () => {
    const changer = {
      change: vi.fn().mockResolvedValue({ id: "edition-1", year: 2026, status: "closed" }),
    };

    await expect(
      changeEditionStatus(
        {
          id: "edition-1",
          year: 2026,
          currentStatus: "open",
          status: "closed",
          memberId: "admin-1",
        },
        { changer, clock: { now: () => new Date("2026-08-04T12:00:00.000Z") } },
      ),
    ).resolves.toMatchObject({ status: "closed" });
    expect(changer.change).toHaveBeenCalledOnce();
  });

  it("rechaza estados desconocidos antes de tocar el puerto", async () => {
    const changer = { change: vi.fn() };

    await expect(
      changeEditionStatus(
        {
          id: "edition-1",
          year: 2026,
          currentStatus: "open",
          status: "archived",
          memberId: "admin-1",
        },
        { changer, clock: { now: () => new Date() } },
      ),
    ).rejects.toThrow(/estado/i);
    expect(changer.change).not.toHaveBeenCalled();
  });
});
