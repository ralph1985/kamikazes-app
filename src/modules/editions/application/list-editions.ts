import type { EditionReader } from "./ports";

export async function listEditions(reader: EditionReader) {
  return reader.list();
}
