import type { DatabaseSync, StatementSync } from "node:sqlite";
import type { PreparedValueOperation } from "../enhanced-store.js";
import type { PreparedValueKeyListOptions } from "../key-listing.js";
import { ValueStoreError } from "../errors.js";
import { compareBytes, decodeString, encodeString, nextBlobPrefix } from "./codec.js";
import { sanitiseSqliteError } from "./errors.js";

// BLOBs preserve exact JavaScript code units; the composite key keeps namespaces
// independent. WITHOUT ROWID stores by that key without a separate rowid and PK
// index, while STRICT enforces the declared storage classes.
const valuesSql = "CREATE TABLE fancy_kit_values (namespace BLOB NOT NULL, key BLOB NOT NULL, value BLOB NOT NULL, PRIMARY KEY (namespace, key)) STRICT, WITHOUT ROWID";
// The primary key and CHECK allow only one metadata row (id=1), separate from
// application namespaces and database-wide PRAGMAs.
const metaSql = "CREATE TABLE fancy_kit_value_store_meta (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL) STRICT";
// Borrowed facades over the same native object must share one lock and fault state.
const coordinators = new WeakMap<DatabaseSync, SqliteCoordinator>();

/**
 * Internal non-reentrant SQL lock and fault boundary for one native connection.
 *
 * @remarks
 * SQL helpers require admission through `run()`. Preparation and decoding stay
 * outside that critical section; a file manager separately tracks their lifetime.
 * Multiple borrowed facades share this coordinator without transferring ownership.
 */
export class SqliteCoordinator {
  private tail: Promise<unknown> = Promise.resolve();
  private readonly statements = new Map<string, StatementSync>();
  /** Retained unsafe-connection failure; ordinary queue entries reject before further SQL. */
  fault: ValueStoreError | undefined;
  /** @param database - The actual connection identity; construction does not open or take ownership of it. */
  constructor(readonly database: DatabaseSync) {}

  /**
   * Queues synchronous native work after the preceding SQL critical section.
   *
   * @param operation - Trusted synchronous work; it must not await or re-enter this lock.
   * @param allowFault - Defaults to false; true permits owned teardown after a fault, never ordinary I/O.
   * @returns The operation's result, or a sanitised rejection; rejection does not stall the queue.
   */
  run<T>(operation: () => T, allowFault = false): Promise<T> {
    const result = this.tail.then(() => {
      if (this.fault && !allowFault) throw this.fault;
      try { return operation(); } catch (error) { throw sanitiseSqliteError(error); }
    });
    // A rejected operation belongs to its caller; it must not poison later queue entries.
    this.tail = result.catch(() => undefined);
    return result;
  }

  /** Reject host-owned transactions so Kit never commits or exposes their uncommitted work. */
  checkTransaction(): void {
    if (typeof this.database.isTransaction !== "boolean") throw new ValueStoreError("unavailable");
    if (this.database.isTransaction) throw new ValueStoreError("operation-failed");
  }

  /** Cache fixed statements with stable object rows and JavaScript-number integers. */
  statement(sql: string): StatementSync {
    let statement = this.statements.get(sql);
    if (!statement) {
      statement = this.database.prepare(sql);
      statement.setReadBigInts(false);
      statement.setReturnArrays?.(false);
      this.statements.set(sql, statement);
    }
    return statement;
  }

  /**
   * Applies trusted synchronous work in a transaction started and owned by Kit.
   *
   * @remarks
   * Requires the coordinator lock and an initially transaction-free connection.
   * A failed statement attempts rollback. A failed rollback or uncertain commit
   * faults the coordinator, so subsequent normal work cannot read staged values.
   * The surrounding `run()` boundary sanitises escaped errors.
   *
   * @param operation - Prepared native mutations; no serialiser, external callback, or await.
   */
  transaction(operation: () => void): void {
    this.checkTransaction();
    // Reserve the writer before applying conditionals; no awaits or host callbacks run inside.
    this.database.exec("BEGIN IMMEDIATE");
    try {
      operation();
    } catch (error) {
      try { this.database.exec("ROLLBACK"); }
      // Only a failed rollback makes an ordinary statement failure leave connection state uncertain.
      catch { this.fault = new ValueStoreError("operation-failed"); }
      throw error;
    }
    try { this.database.exec("COMMIT"); }
    catch (error) {
      // Commit may have taken effect before the error was reported, so the connection cannot be reused.
      this.fault = sanitiseSqliteError(error);
      try { if (this.database.isTransaction) this.database.exec("ROLLBACK"); } catch { /* Retain the fault. */ }
      throw this.fault;
    }
  }

  /**
   * Validate Kit's reserved objects; create them only for a new managed file or
   * explicit borrowed-connection initialisation. Existing objects must match exactly.
   *
   * @param allowCreate - Allows installation only when both reserved objects are absent.
   * Partial, incompatible, or unknown-version objects are never repaired or reset.
   * @throws A fixed `invalid-data` store error for an unrecognised schema; native
   * failures escape to `run()`. Future migrations must preserve the transaction boundary.
   */
  validateSchema(allowCreate: boolean): void {
    this.checkTransaction();
    const tables = this.statement("SELECT name, sql FROM sqlite_schema WHERE name IN ('fancy_kit_values', 'fancy_kit_value_store_meta')").all();
    if (tables.length === 0 && allowCreate) {
      this.transaction(() => {
        // Another connection may have installed the schema before BEGIN acquired its lock.
        if (this.statement("SELECT name FROM sqlite_schema WHERE name IN ('fancy_kit_values', 'fancy_kit_value_store_meta')").all().length === 0) {
          this.database.exec(valuesSql);
          this.database.exec(metaSql);
          this.database.exec("INSERT INTO fancy_kit_value_store_meta (id, version) VALUES (1, 1)");
        }
        this.validateExistingSchema();
      });
    } else {
      this.validateExistingSchema();
    }
  }

  private validateExistingSchema(): void {
    const tables = this.statement("SELECT name, sql FROM sqlite_schema WHERE name IN ('fancy_kit_values', 'fancy_kit_value_store_meta')").all();
    // Exact stored DDL validation rejects look-alike tables with different constraints or storage modes.
    if (tables.length !== 2 || !tables.some(row => row.name === "fancy_kit_values" && row.sql === valuesSql)
      || !tables.some(row => row.name === "fancy_kit_value_store_meta" && row.sql === metaSql)) throw new ValueStoreError("invalid-data");
    const versions = this.statement("SELECT id, version FROM fancy_kit_value_store_meta").all();
    // Version 1 is the first format. Add only real, transactional migrations here.
    if (versions.length !== 1 || versions[0].id !== 1 || versions[0].version !== 1) throw new ValueStoreError("invalid-data");
    // Table triggers could change Kit's write semantics behind the adapter's checks.
    if (this.statement("SELECT name FROM sqlite_schema WHERE type = 'trigger' AND tbl_name IN ('fancy_kit_values', 'fancy_kit_value_store_meta')").all().length) throw new ValueStoreError("invalid-data");
  }

  /**
   * Reads one stored value without consulting queued preparations.
   *
   * @param namespace - Losslessly encoded namespace, separate from the physical key.
   * @param key - Complete physical key, already including the facade's literal prefix.
   * @returns Exact decoded text, or null only when no row exists; malformed BLOBs fail.
   */
  read(namespace: Uint8Array, key: string): string | null {
    this.checkTransaction();
    // Only row absence maps to null; a malformed value BLOB is rejected by the codec.
    const row = this.statement("SELECT value FROM fancy_kit_values WHERE namespace = ? AND key = ?").get(namespace, encodeString(key));
    return row === undefined ? null : decodeString(row.value);
  }

  /**
   * Applies one prepared batch in array order within a single SQL transaction.
   *
   * @param namespace - Encoded namespace shared by every operation in this batch.
   * @param prefix - Literal prefix applied once to each prepared logical key.
   * @param operations - Validated, snapshotted, serialised mutations; empty still checks transaction ownership.
   */
  write(namespace: Uint8Array, prefix: string, operations: readonly PreparedValueOperation[]): void {
    this.checkTransaction();
    if (!operations.length) return;
    // Names, keys, and values stay bound data; serialisation has already completed outside this lock.
    this.transaction(() => {
      for (const operation of operations) {
        const key = encodeString(prefix + operation.key);
        if (operation.type === "delete") {
          this.statement("DELETE FROM fancy_kit_values WHERE namespace = ? AND key = ?").run(namespace, key);
        } else {
          // DO NOTHING leaves an existing row untouched; it is neither delete/reinsert nor replacement.
          // Ordinary writes instead upsert the value at the same composite key.
          const sql = operation.ifAbsent
            ? "INSERT INTO fancy_kit_values (namespace, key, value) VALUES (?, ?, ?) ON CONFLICT (namespace, key) DO NOTHING"
            : "INSERT INTO fancy_kit_values (namespace, key, value) VALUES (?, ?, ?) ON CONFLICT (namespace, key) DO UPDATE SET value = excluded.value";
          this.statement(sql).run(namespace, key, encodeString(operation.value));
        }
      }
    });
  }

  /** Lists logical keys with a key-only query over encoded BLOB bounds. */
  listKeys(namespace: Uint8Array, prefix: string, options: PreparedValueKeyListOptions): string[] {
    this.checkTransaction();
    const prefixBytes = encodeString(prefix + options.prefix);
    let lower: Uint8Array | undefined;
    let lowerExclusive = false;
    let upper: Uint8Array | undefined;
    let upperExclusive = false;
    if (prefixBytes.length > 0) {
      lower = prefixBytes;
      const next = nextBlobPrefix(prefixBytes);
      if (next !== undefined) {
        upper = next;
        upperExclusive = true;
      }
    }
    if (options.lower !== undefined) {
      const candidate = encodeString(prefix + options.lower);
      const comparison = lower === undefined ? 1 : compareBytes(candidate, lower);
      if (lower === undefined || comparison > 0) {
        lower = candidate;
        lowerExclusive = options.lowerExclusive;
      } else if (comparison === 0) {
        lowerExclusive ||= options.lowerExclusive;
      }
    }
    if (options.upper !== undefined) {
      const candidate = encodeString(prefix + options.upper);
      const comparison = upper === undefined ? -1 : compareBytes(candidate, upper);
      if (upper === undefined || comparison < 0) {
        upper = candidate;
        upperExclusive = options.upperExclusive;
      } else if (comparison === 0) {
        upperExclusive ||= options.upperExclusive;
      }
    }
    if (options.limit === 0 || (lower !== undefined && upper !== undefined
      && (compareBytes(lower, upper) > 0 || (compareBytes(lower, upper) === 0 && (lowerExclusive || upperExclusive))))) return [];
    let sql = "SELECT key FROM fancy_kit_values WHERE namespace = ?";
    const parameters: (Uint8Array | number)[] = [namespace];
    if (lower !== undefined) {
      sql += lowerExclusive ? " AND key > ?" : " AND key >= ?";
      parameters.push(lower);
    }
    if (upper !== undefined) {
      sql += upperExclusive ? " AND key < ?" : " AND key <= ?";
      parameters.push(upper);
    }
    sql += " ORDER BY key ASC";
    if (options.limit !== undefined) {
      sql += " LIMIT ?";
      parameters.push(options.limit);
    }
    const rows = this.statement(sql).all(...parameters);
    const keys: string[] = [];
    for (const row of rows) {
      const decoded = decodeString(row.key);
      if (!decoded.startsWith(prefix)) throw new ValueStoreError("invalid-data");
      keys.push(decoded.slice(prefix.length));
    }
    return keys;
  }

  /**
   * Deletes only the encoded namespace's literal-prefix rows in one transaction.
   *
   * @remarks
   * An empty prefix covers the namespace. Other namespaces and schema metadata
   * remain intact. Preparing writes are not cancelled and may apply after clear.
   */
  clear(namespace: Uint8Array, prefix: string): void {
    this.checkTransaction();
    const start = encodeString(prefix);
    this.transaction(() => {
      if (prefix.length === 0) {
        this.statement("DELETE FROM fancy_kit_values WHERE namespace = ?").run(namespace);
      } else {
        const end = nextBlobPrefix(start);
        if (end !== undefined) {
          this.statement("DELETE FROM fancy_kit_values WHERE namespace = ? AND key >= ? AND key < ?")
            .run(namespace, start, end);
        } else {
          this.statement("DELETE FROM fancy_kit_values WHERE namespace = ? AND key >= ?")
            .run(namespace, start);
        }
      }
    });
  }

  /**
   * Closes a manager-owned connection and releases its cached statements.
   *
   * @remarks
   * Borrowed facades never call this. Normal closure requires no external
   * transaction; poisoned owned connections may be closed solely for teardown.
   * A close failure is retained instead of retrying a possibly completed close.
   */
  close(): void {
    if (!this.fault) this.checkTransaction();
    try { this.database.close(); this.statements.clear(); }
    catch (error) { this.fault = sanitiseSqliteError(error); throw this.fault; }
  }
}

/** Reuses a coordinator across independently constructed borrowed stores. */
export function coordinatorFor(database: DatabaseSync): SqliteCoordinator {
  let coordinator = coordinators.get(database);
  if (!coordinator) { coordinator = new SqliteCoordinator(database); coordinators.set(database, coordinator); }
  return coordinator;
}
