import type { PublicContentReader } from "./ports";

export async function readPublicContent(reader: PublicContentReader) {
  const [sections, socialLinks] = await Promise.all([
    reader.listSections({ visibleOnly: true }),
    reader.listSocialLinks({ activeOnly: true }),
  ]);
  return { sections, socialLinks };
}
