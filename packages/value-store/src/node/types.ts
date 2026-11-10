import type { ValueStoreOptions } from "../contracts.js";

/**
 * Construction options for the Node JSON-file value store.
 *
 * @remarks
 * The store resolves the file path and captures the prefix synchronously.
 * Construction requires the parent directory to exist and validates any
 * existing document. The adapter uses one complete JSON document with an
 * inclusive 1,048,576-byte UTF-8 limit; see `createJsonFileValueStore` for its
 * replacement, concurrency, and disposal behaviour.
 */
export interface JsonFileValueStoreOptions extends ValueStoreOptions {
  /**
   * Path to the dedicated JSON file in an existing directory. Relative paths
   * resolve once at construction; the adapter does not create the parent or
   * create a missing file until a value write changes the document. If a valid
   * file was observed and later disappears, operations fail with `unavailable`
   * rather than recreating it. Coordinate a single writer per file; mutations
   * from separate Node workers or processes are not coordinated.
   */
  filePath: string;
  /**
   * Complete literal prefix prepended verbatim to every logical key, including
   * any delimiters. The empty string is allowed and makes `clear()` cover every
   * entry in this document.
   */
  prefix: string;
}
