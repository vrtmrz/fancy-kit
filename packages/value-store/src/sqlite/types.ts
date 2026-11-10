import type { ValueStoreOptions, ValueStore, ValueDeleter, ValueBatchWriter, ValueClearer, ValueStoreDisposer } from "../contracts.js";
import type { ValueStoreError } from "../errors.js";

/**
 * Captured scope and serialisation options for a native SQLite value store.
 *
 * @remarks
 * Namespace and prefix are independent. Stores selecting the same namespace and
 * physical key share data, so their callers must agree on the serialiser.
 * Keys, prefixes, namespaces, and values retain their exact JavaScript code units.
 */
export interface SqliteValueStoreOptions extends ValueStoreOptions {
  /**
   * Complete literal prefix used to form the physical key as `prefix + key`.
   *
   * @remarks
   * Required even when empty. Supply any separator explicitly; no trimming,
   * normalisation, or delimiter insertion occurs. The serialiser still receives
   * the unprefixed logical key. Overlapping prefixes can address the same entry
   * and can overlap the scope removed by `clear()`.
   */
  prefix: string;
  /**
   * Independent exact namespace containing the store's physical keys.
   *
   * @remarks
   * The empty string is an ordinary namespace, not a selector for all namespaces.
   * An empty prefix clears only this namespace. Namespace separation is logical
   * and does not establish access control over a supplied connection or file.
   *
   * @defaultValue The empty string.
   */
  namespace?: string;
}

/**
 * Explicit file selection and policy for internally managed SQLite connections.
 *
 * @remarks
 * Stores selecting the same canonical file in one loaded Kit module share its
 * connection and initialisation. Conflicting connection-wide durability choices
 * are rejected rather than changing another store's settings. This policy does
 * not coordinate separate processes, workers, or duplicate module instances.
 */
export interface SqliteFileValueStoreOptions extends SqliteValueStoreOptions {
  /**
   * Filesystem path to the SQLite database in an existing parent directory.
   *
   * @remarks
   * Relative paths resolve once at construction. The string is interpreted as a
   * filesystem path, never as caller-supplied SQLite URI options. Kit creates no
   * parent directories and rejects final symbolic links, extra hard links, and
   * non-regular targets. An initially absent file is created only by a prepared
   * value write; a previously observed file disappearing is an error.
   */
  filePath: string;
  /**
   * SQLite synchronisation policy for the managed WAL connection.
   *
   * @remarks
   * `'full'` selects `synchronous=FULL`; `'normal'` selects `synchronous=NORMAL`
   * and accepts possible loss of recent committed updates after an OS crash or
   * power failure. Successful writes resolve after their SQL commit, before any
   * later idle close or checkpoint. Neither setting overrides filesystem or
   * hardware durability limits. Borrowed connections keep their owner's policy.
   *
   * @defaultValue `'full'`.
   */
  durability?: "full" | "normal";
  /**
   * Optional notification of a retained shared-file fault.
   *
   * @remarks
   * This includes initialisation and idle-close failures detected while the
   * store is subscribed. The fixed {@link ValueStoreError} contains no upstream
   * message, cause, SQL, path, or stored value. Notification runs outside the
   * native SQL critical section and is not awaited by lifecycle work. Throws
   * and rejected hook promises are contained, so logging cannot change an
   * operation's result or block disposal. There is no replay guarantee for a
   * fault retained before this store subscribed. Subsequent operations and
   * disposal still report a retained fault without a hook. Disposal removes
   * this store's subscription; it does not wait for an already invoked hook.
   *
   * @defaultValue No notification hook.
   */
  onBackgroundError?: (error: ValueStoreError) => void | Promise<void>;
}

/**
 * SQLite value operations, ordered transactions, scoped clear, and store disposal.
 *
 * @remarks
 * `writeBatch()` commits its prepared operations in one SQL transaction. An
 * ordinary statement error rolls back the batch; a commit or rollback failure
 * can leave the outcome uncertain and prevents reuse of that connection.
 * `clear()` removes only the selected namespace and literal prefix, preserving
 * other scopes and Kit metadata. `dispose()` stops and drains this store; it
 * never closes a borrowed connection or waits for another store's work.
 *
 * Read and write methods return promises, but native SQLite I/O is synchronous
 * and can block the event loop. There is no queued-value cache, cross-call FIFO
 * guarantee, automatic retry, public SQL transaction callback, or public pool.
 */
export type SqliteValueStore = ValueStore & ValueDeleter & ValueBatchWriter & ValueClearer & ValueStoreDisposer;
