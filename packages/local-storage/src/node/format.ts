import { validateLocalValue } from "../validation.js";
import { LocalStorageError } from "../errors.js";

/** Inclusive limit for the complete UTF-8 JSON document. */
export const MAX_DOCUMENT_BYTES = 1_048_576;

/** Decodes a strict version-1 string-value document without object-key coercion. */
export function decodeDocument(bytes: Uint8Array): Map<string, string> {
  let document: unknown;
  try {
    document = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes));
  } catch {
    throw new LocalStorageError("invalid-data");
  }
  if (
    document === null || typeof document !== "object" || Array.isArray(document)
    || Object.keys(document).length !== 2
    || !Object.hasOwn(document, "version") || !Object.hasOwn(document, "entries")
    || (document as { version: unknown }).version !== 1
    || !Array.isArray((document as { entries: unknown }).entries)
  ) throw new LocalStorageError("invalid-data");
  const entries = new Map<string, string>();
  for (const entry of (document as { entries: unknown[] }).entries) {
    if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string" || entries.has(entry[0])) {
      throw new LocalStorageError("invalid-data");
    }
    validateLocalValue(entry[1], "invalid-data");
    entries.set(entry[0], entry[1]);
  }
  return entries;
}

/** Serialises the complete candidate before any persistent mutation. */
export function encodeDocument(entries: ReadonlyMap<string, string>): Uint8Array {
  const bytes = new TextEncoder().encode(JSON.stringify({ version: 1, entries: [...entries] }));
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) throw new LocalStorageError("quota-exceeded");
  return bytes;
}
