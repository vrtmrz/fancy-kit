import type { ValueBatchWriter, ValueClearer, ValueDeleter, ValueStore, ValueStoreDisposer } from "../contracts.js";
import { createJsonFileValueStoreWithOperations } from "./files.js";
import { jsonFileOperations } from "./operations.js";
import type { JsonFileValueStoreOptions } from "./types.js";

export type { JsonFileValueStoreOptions } from "./types.js";

/**
 * Creates an asynchronous value store backed by synchronous Node JSON-file I/O.
 *
 * @remarks
 * Construction synchronously validates options, the existing parent
 * directory, and any existing document. The parent must already exist; the
 * factory never creates directories. A missing file starts as an empty store
 * and remains absent until a value write changes it. Once a valid file has
 * been observed, its later disappearance rejects operations with
 * `unavailable` rather than recreating an empty document.
 *
 * Keys map to `prefix + key` exactly. The optional paired serialiser receives
 * logical keys and runs around raw strings; object methods encode JSON and
 * preserve JSON `null`, false, zero, and empty strings as data. The complete
 * UTF-8 document, including metadata, keys, and escaped values, has an
 * inclusive 1,048,576-byte limit. It is not a per-value limit. A mutation
 * exceeding it rejects with `quota-exceeded` before file replacement.
 *
 * Each successfully prepared, non-empty batch reads the document once and applies its
 * mutations to one candidate in order, replacing the document at most once. A
 * batch consisting only of skipped conditional writes or absent deletions does
 * not replace the file. `clear()` replaces the
 * document only when needed and removes physical keys beginning with this
 * instance's literal prefix; overlapping prefixes can share entries, and a
 * write still preparing is not cancelled by clear.
 *
 * Writes use synchronous native filesystem calls: they exclusively create a
 * mode-0600 temporary file beside the destination, flush and close it, then
 * rename it over the destination. A failure after replacement starts has an
 * uncertain outcome. The adapter does not coordinate multiple writers across
 * Node workers or processes and has no retry, automatic migration, encryption,
 * or hardware power-loss guarantee. The existing parent must remain the same
 * directory, with trusted owners controlling its path. Entry symlinks, extra
 * hard links, and non-regular files are rejected.
 *
 * Disposal stops admission synchronously and drains accepted work; it does not
 * create or flush a file. Ordinary operation failures remain on their own
 * promises, and disposal does not certify successful writes.
 *
 * @param options - Existing-directory file path, required complete physical key
 * prefix, and optional paired serialiser.
 * @returns Value operations, ordered batches, prefix-scoped clearing, and disposal.
 * @throws `ValueStoreError` is thrown synchronously for invalid construction
 * options, an unavailable or invalid parent, or an invalid existing document.
 * Later operation failures reject their returned promises with a fixed
 * `ValueStoreError` code and no upstream cause or path. A rejection after
 * replacement begins does not establish whether the file changed.
 */
export function createJsonFileValueStore(options: JsonFileValueStoreOptions): ValueStore & ValueDeleter & ValueBatchWriter & ValueClearer & ValueStoreDisposer {
  return createJsonFileValueStoreWithOperations(options, jsonFileOperations);
}
