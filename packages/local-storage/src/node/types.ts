import type { LocalValueStoreOptions } from "../contracts.js";

/** Explicit file and physical key prefix for Node string-value storage. */
export interface NodeLocalStoreOptions extends LocalValueStoreOptions {
  /**
   * Dedicated JSON file in an existing directory. Relative paths resolve once at
   * construction. A missing file starts empty without being created. One process
   * owns writes; worker-thread and multi-process mutations are not supported.
   */
  filePath: string;
  /** Complete literal key prefix, including any delimiters; empty is allowed. */
  prefix: string;
}
