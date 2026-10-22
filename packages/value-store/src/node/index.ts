import type { ValueDeleter, ValueStore } from "../contracts.js";
import { createJsonFileValueStoreWithOperations } from "./files.js";
import { jsonFileOperations } from "./operations.js";
import type { JsonFileValueStoreOptions } from "./types.js";

export type { JsonFileValueStoreOptions } from "./types.js";

/**
 * Opens an asynchronous value store backed by synchronous Node JSON-file I/O.
 *
 * Construction validates the existing parent and any existing document without
 * creating paths. Each operation reads current data; no value cache or delayed
 * flush exists. Keys map to `prefix + key` exactly. Value methods read and write
 * raw strings, including empty strings as data. Object methods encode JSON and
 * preserve empty strings, zero, false, and null as data. The optional paired
 * serializer runs around the raw string boundary. A document is limited to
 * 1 MiB of UTF-8;
 * a mutation exceeding that limit throws `quota-exceeded` before a file write.
 *
 * Writes exclusively create a mode-0600 temporary file beside the destination,
 * flush and close it, and rename it over the destination. Replacement is atomic
 * only on filesystems providing that operation. A failure after rename starts
 * has an uncertain outcome. There is no transaction, lock, retry, automatic
 * migration, encryption, or hardware power-loss guarantee. The existing parent
 * must remain the same directory, with trusted owners controlling its path.
 * Entry symlinks, extra hard links, and non-regular files are rejected.
 *
 * @param options - The file and complete physical key prefix.
 * @returns A store with asynchronous value/object operations and idempotent deletion.
 * @throws ValueStoreError with a fixed code and no upstream cause or path.
 */
export function createJsonFileValueStore(options: JsonFileValueStoreOptions): ValueStore & ValueDeleter {
  return createJsonFileValueStoreWithOperations(options, jsonFileOperations);
}
