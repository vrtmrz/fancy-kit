import type { DatabaseSync } from "node:sqlite";
import { createEnhancedValueStore, type PreparedValueOperation } from "../enhanced-store.js";
import { ValueStoreError } from "../errors.js";
import { validateValuePrefix } from "../validation.js";
import { coordinatorFor } from "./connection.js";
import { encodeString } from "./codec.js";
import { sanitiseSqliteError } from "./errors.js";
import { managedFile, type FileManager } from "./manager.js";
import type { SqliteFileValueStoreOptions, SqliteValueStoreOptions, SqliteValueStore } from "./types.js";

export type { SqliteFileValueStoreOptions, SqliteValueStoreOptions, SqliteValueStore } from "./types.js";

/**
 * Creates a scoped value store over a caller-owned native SQLite connection.
 *
 * @remarks
 * The facade is returned synchronously. Its operations and disposal wait for
 * asynchronous initialisation, which installs missing Kit tables or validates
 * their existing schema without changing unrelated tables, database-wide
 * version markers, or the owner's PRAGMA settings. Invalid or incomplete Kit
 * objects are rejected without being reset. A malformed serialiser is rejected
 * before initialisation starts.
 *
 * All Kit stores wrapping the same connection share one SQL lock. Once that
 * lock is acquired, reads and writes reject an active host-owned transaction
 * without committing or rolling it back. The owner must avoid direct SQL while
 * Kit operations are using the connection. Native I/O remains synchronous even
 * though the value methods return promises. Statement result settings are
 * selected only on Kit's own statements, preserving the connection's defaults.
 *
 * The owner must stop producers and dispose every Kit user before closing the
 * database. Disposal stops admission and drains this store's accepted work,
 * including serialisation and decoding; it never closes the supplied database.
 * Individual operation promises retain their own results, and disposal is not
 * proof that every earlier write succeeded.
 *
 * @param database - An open native connection whose lifetime remains with the caller.
 * @param options - Exact namespace, literal physical-key prefix, and optional serialiser.
 * @returns A store with SQL batches, scoped clear, and per-store disposal.
 * @throws {@link index.ValueStoreError | ValueStoreError} Synchronously for invalid options or missing
 * native capabilities. Initialisation and I/O failures instead reject operation
 * or disposal promises with fixed errors, without leaking native diagnostics.
 *
 * @example
 * ```ts
 * import { DatabaseSync } from 'node:sqlite';
 * import { createSqliteValueStore } from '@vrtmrz/value-store/node-sqlite';
 *
 * const database = new DatabaseSync(':memory:');
 * const state = createSqliteValueStore(database, { prefix: 'peer:' });
 * try {
 *   await state.setObject('checkpoint', { since: 'sequence' });
 * } finally {
 *   try { await state.dispose(); } finally { database.close(); }
 * }
 * ```
 */
export function createSqliteValueStore(database: DatabaseSync, options: SqliteValueStoreOptions): SqliteValueStore {
  try {
    const { prefix, namespace } = captureScope(options);
    if (!database || typeof database.prepare !== "function" || typeof database.exec !== "function") throw new ValueStoreError("unavailable");
    const coordinator = coordinatorFor(database);
    let ready: Promise<void>;
    const bytes = encodeString(namespace);
    async function access<T>(operation: () => T): Promise<T> { await ready; return coordinator.run(operation); }
    const store = createEnhancedValueStore({
      get: key => access(() => coordinator.read(bytes, prefix + key)),
      set: (key, value) => access(() => coordinator.write(bytes, prefix, [{ type: "set", key, value }])),
      delete: key => access(() => coordinator.write(bytes, prefix, [{ type: "delete", key }])),
      writeBatch: operations => access(() => coordinator.write(bytes, prefix, operations)),
      clear: () => access(() => coordinator.clear(bytes, prefix)),
    }, options, { onStart() {}, onFinish() {}, dispose: async () => { await ready; if (coordinator.fault) throw coordinator.fault; } });
    ready = coordinator.run(() => coordinator.validateSchema(true));
    void ready.catch(() => undefined);
    return store;
  } catch (error) { throw sanitiseSqliteError(error); }
}

/**
 * Creates a scoped SQLite value store with an internally managed file connection.
 *
 * @remarks
 * Construction returns the facade synchronously. Every operation and disposal
 * automatically waits for shared initialisation. An existing recognised file is
 * opened in existing-only mode, checked, and closed once before ordinary I/O.
 * An initially missing file remains absent for reads, delete, clear, empty
 * batches, and delete-only batches. The first fully prepared value write creates
 * it. Permission, format, schema, and previously observed file-loss errors never
 * become absence or trigger conversion from an old JSON file.
 *
 * The parent directory must already exist and retain its identity. Stores for
 * the same canonical file share one connection within a loaded module; separate
 * workers or processes rely on SQLite locking. WAL/FULL is the default, NORMAL
 * is an explicit durability trade-off, and busy failures are not retried. See
 * {@link SqliteFileValueStoreOptions} for scope, path, and policy details.
 *
 * An unreferenced timer reserves closure after an internal one-second idle
 * grace period and rechecks for accepted work before closing. Later operations
 * reopen normally. Counts include preparation,
 * lock waiting, and decoding. The timer need not run before process exit;
 * successful writes have already committed, and remaining WAL files can recover
 * on subsequent access. Disposal synchronously stops this store's admission,
 * drains its work, and closes immediately if no shared operation is pending.
 * Other stores remain usable; a faulted or disposed store is not reopened.
 *
 * Initialisation and deferred-close faults are retained for operations and
 * disposal, with optional notification through `onBackgroundError`. Individual
 * write results are not changed by a later close failure. Native I/O is
 * synchronous. The native entry is qualified separately: Deno 2.9.7 managed-file
 * use requires `--allow-all` because scoped permissions misresolve the fixed
 * existing-only URI. General network-filesystem and power-loss guarantees are
 * outside this adapter's contract.
 *
 * @param options - Explicit file path, literal prefix, namespace, serialiser, and managed policy.
 * @returns A reusable facade with SQL batches, scoped clear, and terminal disposal.
 * @throws {@link index.ValueStoreError | ValueStoreError} Synchronously for invalid options or conflicting
 * shared-file settings. File initialisation and later I/O failures reject the
 * asynchronous operations or disposal instead of making construction awaitable.
 *
 * @example
 * ```ts
 * import { createSqliteFileValueStore } from '@vrtmrz/value-store/node-sqlite';
 *
 * // The application has already created the data directory.
 * const state = createSqliteFileValueStore({
 *   filePath: 'data/state.sqlite',
 *   prefix: 'peer:',
 *   namespace: 'bridge-state',
 * });
 * try {
 *   await state.writeBatch([
 *     { type: 'setObject', key: 'checkpoint', value: { since: 'sequence' } },
 *     { type: 'setValue', key: 'seed', value: '', ifAbsent: true },
 *   ]);
 * } finally {
 *   await state.dispose();
 * }
 * ```
 */
export function createSqliteFileValueStore(options: SqliteFileValueStoreOptions): SqliteValueStore {
  try {
    const scope = captureScope(options);
    const filePath = options.filePath;
    if (typeof filePath !== "string" || !filePath || filePath.includes("\0")) throw new ValueStoreError("invalid-value");
    const durability = options.durability === undefined ? "full" : options.durability;
    if (durability !== "full" && durability !== "normal") throw new ValueStoreError("invalid-value");
    const listener = options.onBackgroundError;
    if (listener !== undefined && typeof listener !== "function") throw new ValueStoreError("invalid-value");
    // Capture the facade/serialiser before allocating a manager or starting I/O.
    let manager: FileManager;
    const namespace = encodeString(scope.namespace);
    const store = createEnhancedValueStore({
      get: key => manager.access(false, null, connection => connection.read(namespace, scope.prefix + key)),
      set: (key, value) => write([{ type: "set", key, value }]),
      delete: key => write([{ type: "delete", key }]),
      writeBatch: operations => write(operations),
      clear: () => manager.access(false, undefined, connection => connection.clear(namespace, scope.prefix)),
    }, options, {
      onStart: () => manager.start(),
      onFinish: () => manager.finish(),
      dispose: () => manager.dispose(subscription),
    });
    manager = managedFile(filePath, durability);
    const subscription = manager.subscribe(listener);
    function write(operations: readonly PreparedValueOperation[]): Promise<void> {
      // Only prepared set operations may trigger delayed database creation.
      return manager.access(operations.some(operation => operation.type === "set"), undefined,
        connection => connection.write(namespace, scope.prefix, operations));
    }
    return store;
  } catch (error) { throw sanitiseSqliteError(error); }
}

/** Captures exact strings once; namespace and prefix are not normalised. */
function captureScope(options: SqliteValueStoreOptions): { prefix: string; namespace: string } {
  const prefix = options?.prefix;
  validateValuePrefix(prefix);
  const namespace = options?.namespace === undefined ? "" : options.namespace;
  if (typeof namespace !== "string") throw new ValueStoreError("invalid-value");
  return { prefix, namespace };
}
