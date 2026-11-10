import { setTimeout, clearTimeout } from "node:timers";
import { constants, lstatSync, statSync, realpathSync, openSync, closeSync, type BigIntStats } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { ValueStoreError } from "../errors.js";
import { coordinatorFor, type SqliteCoordinator } from "./connection.js";
import { sanitiseSqliteError } from "./errors.js";

/** Private injectable native/timer boundary; the public entry always uses real operations. */
export interface SqliteFileOperations {
  /** Opens a verified existing path; tests may inject native failures here. */
  open(path: string): DatabaseSync;
  /** Reserves one unreferenced idle callback and returns its cancellation handle. */
  schedule(callback: () => void): { cancel(): void };
}
export const sqliteFileOperations: SqliteFileOperations = {
  // SQLite's native rw mode is the final no-create boundary; timeout zero adds no hidden busy wait.
  open: path => new DatabaseSync(pathToFileURL(path).href + "?mode=rw", { timeout: 0 }),
  schedule(callback) {
    // One second is an internal idle grace period; the timer alone must not keep Node alive.
    const timer = setTimeout(callback, 1000);
    timer.unref();
    return { cancel: () => clearTimeout(timer) };
  },
};

type Listener = ((error: ValueStoreError) => void | Promise<void>) | undefined;
interface Subscription { listener: Listener }
const managers = new Map<string, FileManager>();

/**
 * Use the canonical parent plus the requested leaf as the shared manager key.
 * The leaf remains creatable; later lstat checks reject links and pin its identity.
 */
export function managedFile(path: string, durability: "full" | "normal"): FileManager {
  // Parent I/O belongs to the asynchronous initialisation boundary, not option validation.
  const absolute = resolve(path);
  let identityPath = absolute;
  try { identityPath = join(realpathSync(dirname(absolute)), basename(absolute)); } catch { /* Initialisation reports the error. */ }
  let manager = managers.get(identityPath);
  if (manager && manager.durability !== durability) throw new ValueStoreError("invalid-value");
  if (!manager) {
    manager = new FileManager(identityPath, durability, sqliteFileOperations, () => managers.delete(identityPath));
    managers.set(identityPath, manager);
  }
  return manager;
}

/**
 * Internal owner of one file's initialisation, connection lifetime, and retained fault.
 *
 * @remarks
 * This queue serialises path/open/close transitions. The connection coordinator
 * serialises SQL. Accepted facade operations increment a separate whole-operation
 * count before preparation and keep it until read decoding or failure settles.
 * No stored-value cache or public connection-pool capability is provided.
 */
export class FileManager {
  /** Shared initial check/optional open-and-close completion; rejection remains observable. */
  readonly ready: Promise<void>;
  // Serialises path checks and lifecycle transitions; SQLite work has a separate coordinator lock.
  private tail: Promise<unknown> = Promise.resolve();
  private coordinator: SqliteCoordinator | undefined;
  private originalParent: BigIntStats | undefined;
  private identity: BigIntStats | undefined;
  // Counts complete accepted facade operations across every store sharing this file.
  private pending = 0;
  // Invalidates an idle callback after new work opens or reuses the connection.
  private generation = 0;
  private timer: { cancel(): void } | undefined;
  private fault: ValueStoreError | undefined;
  private readonly subscribers = new Set<Subscription>();

  /**
   * Starts shared asynchronous inspection, opening and closing only an existing target.
   *
   * @param filePath - Resolved file-manager key; its parent must already exist.
   * @param durability - Synchronisation policy applied only to connections opened here.
   * @param operations - Native opening and timer boundary; production uses real operations.
   * @param release - Removes an unused manager from its registry; omitted for isolated tests.
   */
  constructor(readonly filePath: string, readonly durability: "full" | "normal",
    private readonly operations: SqliteFileOperations, private readonly release: () => void = () => undefined) {
    this.ready = this.exclusive(async () => {
      try {
        this.inspectParent();
        // Validate and close an existing file before public access. Work accepted
        // during readiness waits on this promise and does not block this close.
        if (this.inspectFile()) {
          await this.open(false);
          await this.close();
        }
      } catch (error) { this.fail(error); throw this.fault; }
    });
    // Initialisation starts immediately, but its rejection also remains available to every caller.
    void this.ready.catch(() => undefined);
  }

  subscribe(listener: Listener): Subscription {
    const subscription = { listener };
    this.subscribers.add(subscription);
    return subscription;
  }

  /**
   * Registers complete facade work and invalidates any reserved idle close.
   *
   * @throws The retained fault before incrementing; rejected admission must not call `finish()`.
   */
  start(): void {
    if (this.fault) throw this.fault;
    // Registration happens before validation and serialisation in the facade.
    this.pending++;
    this.cancelTimer();
  }

  /** Releases exactly one successful admission after preparation, SQL, and decoding settle. */
  finish(): void {
    this.pending--;
    if (this.pending === 0 && this.coordinator && !this.fault) {
      // The generation check prevents an old timer from closing a reopened connection.
      const generation = ++this.generation;
      this.timer = this.operations.schedule(() => {
        void this.exclusive(async () => {
          if (this.pending !== 0 || generation !== this.generation || !this.coordinator || this.fault) return;
          this.timer = undefined;
          await this.close();
          this.releaseIfUnused();
        }).catch(error => this.fail(error));
      });
    }
  }

  /**
   * Runs native access after initialisation and repeated path-identity checks.
   *
   * @param write - True only if prepared work contains a value write allowed to create a missing file.
   * @param absent - Backend absence/no-op result when the file is initially missing and creation is disallowed.
   * @param operation - Trusted synchronous native work under the connection lock.
   * @returns Its result after native completion, or a retained/sanitised failure without automatic retry.
   */
  async access<T>(write: boolean, absent: T, operation: (connection: SqliteCoordinator) => T): Promise<T> {
    await this.ready;
    // This lifecycle queue owns path identity and connection replacement; coordinator.run owns SQL access.
    return this.exclusive(async () => {
      if (this.fault) throw this.fault;
      try {
        this.inspectParent();
        const present = this.inspectFile();
        if (!this.coordinator) {
          // Missing reads and delete-only work observe absence without creating a database.
          if (!present && !write) return absent;
          await this.open(!present);
        }
        return await this.coordinator!.run(() => operation(this.coordinator!));
      } catch (error) {
        const safe = sanitiseSqliteError(error);
        // Native statement failures with successful rollback can continue. Identity/open faults cannot.
        if (!this.coordinator || this.coordinator.fault || safe.code === "unavailable" || safe.code === "invalid-data") this.fail(safe);
        throw safe;
      }
    });
  }

  /**
   * Unsubscribes one already drained facade and closes only an idle shared connection.
   *
   * @param subscription - This facade's notification registration, not another owner's.
   * @returns Completion of this release; retained initialisation/close faults reject it.
   * Other stores' preparation or decoding is not drained by this method.
   */
  async dispose(subscription: Subscription): Promise<void> {
    this.subscribers.delete(subscription);
    this.cancelTimer();
    try {
      await this.ready;
      // This facade has drained before disposal; leave a connection open if another facade is still using it.
      await this.exclusive(async () => { if (this.pending === 0) await this.close(); });
    } finally { this.releaseIfUnused(); }
    if (this.fault) throw this.fault;
  }

  private exclusive<T>(operation: () => T | Promise<T>): Promise<T> {
    const result = this.tail.then(operation);
    this.tail = result.catch(() => undefined);
    return result;
  }

  private inspectParent(): void {
    const stat = statSync(dirname(this.filePath), { bigint: true });
    if (!stat.isDirectory()) throw new ValueStoreError("invalid-data");
    if (this.originalParent && !sameIdentity(stat, this.originalParent)) throw new ValueStoreError("unavailable");
    this.originalParent ??= stat;
  }

  private inspectFile(): boolean {
    let stat: BigIntStats;
    try { stat = lstatSync(this.filePath, { bigint: true }); }
    catch (error) {
      // Absence is normal only until a target has been observed; never recreate a disappeared database.
      if ((error as { code?: string }).code === "ENOENT" && !this.identity) return false;
      throw error;
    }
    if (!stat.isFile() || stat.nlink !== 1n) throw new ValueStoreError("invalid-data");
    if (this.identity && !sameIdentity(stat, this.identity)) throw new ValueStoreError("unavailable");
    this.identity ??= stat;
    return true;
  }

  private async open(create: boolean): Promise<void> {
    if (create) {
      try {
        // Create exclusively only after write preparation; a racing file is inspected, never overwritten.
        const descriptor = openSync(this.filePath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0), 0o600);
        closeSync(descriptor);
      } catch (error) {
        if ((error as { code?: string }).code !== "EEXIST") throw error;
        create = false;
      }
    }
    this.inspectParent();
    this.inspectFile();
    const database = this.operations.open(this.filePath);
    const coordinator = coordinatorFor(database);
    this.coordinator = coordinator;
    try {
      await coordinator.run(() => {
        // Validate an existing schema before changing connection settings; a fresh file is initialised after settings are verified.
        if (!create) coordinator.validateSchema(false);
        coordinator.checkTransaction();
        const journal = coordinator.statement("PRAGMA journal_mode = WAL").get();
        if (!journal || String(journal.journal_mode).toLowerCase() !== "wal") throw new ValueStoreError("operation-failed");
        database.exec(this.durability === "full" ? "PRAGMA synchronous = FULL" : "PRAGMA synchronous = NORMAL");
        if (coordinator.statement("PRAGMA synchronous").get()?.synchronous !== (this.durability === "full" ? 2 : 1)) throw new ValueStoreError("operation-failed");
        if (create) coordinator.validateSchema(true);
        this.inspectParent();
        this.inspectFile();
      });
    } catch (error) {
      this.fail(error);
      // Close the connection we opened, without retrying or replacing the original failure.
      try { database.close(); } catch { /* The retained fault prevents reuse. */ }
      this.coordinator = undefined;
      throw error;
    }
  }

  private async close(): Promise<void> {
    const connection = this.coordinator;
    if (!connection) return;
    try { await connection.run(() => connection.close(), true); }
    catch (error) { this.fail(error); throw this.fault; }
    finally { this.coordinator = undefined; }
  }

  private cancelTimer(): void { this.generation++; this.timer?.cancel(); this.timer = undefined; }

  private fail(error: unknown): void {
    if (this.fault) return;
    this.fault = sanitiseSqliteError(error);
    const fault = this.fault;
    const subscribers = [...this.subscribers];
    // Defer notifications and contain hook failures; callback completion cannot change lifecycle results.
    queueMicrotask(() => {
      for (const subscriber of subscribers) {
        if (!this.subscribers.has(subscriber)) continue;
        try { void Promise.resolve(subscriber.listener?.(fault)).catch(() => undefined); }
        catch { /* Logging must not change lifecycle state or other notifications. */ }
      }
    });
  }

  private releaseIfUnused(): void {
    // Retain the canonical-path manager until no facade, operation, or live connection depends on it.
    if (this.subscribers.size === 0 && this.pending === 0 && !this.coordinator) this.release();
  }
}
function sameIdentity(left: BigIntStats, right: BigIntStats): boolean { return left.dev === right.dev && left.ino === right.ino; }
