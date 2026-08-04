import { describe, expect, it, vi } from "vitest";
import { readPublicContent } from "./read-public-content";

describe("leer contenido público", () => {
  it("solicita sólo secciones visibles y enlaces activos", async () => {
    const reader = {
      listSections: vi.fn().mockResolvedValue([{ id: "section-1", isVisible: true }]),
      listSocialLinks: vi.fn().mockResolvedValue([{ id: "link-1", isActive: true }]),
    };

    await expect(readPublicContent(reader)).resolves.toEqual({
      sections: [{ id: "section-1", isVisible: true }],
      socialLinks: [{ id: "link-1", isActive: true }],
    });
    expect(reader.listSections).toHaveBeenCalledWith({ visibleOnly: true });
    expect(reader.listSocialLinks).toHaveBeenCalledWith({ activeOnly: true });
  });
});
