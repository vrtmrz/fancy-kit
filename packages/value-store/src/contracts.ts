/**
 * A recursive JSON value accepted by the object methods.
 *
 * Runtime values must contain only finite numbers, strings, booleans, `null`,
 * arrays, and plain records. JSON conversion represents negative zero as zero.
 */
export type ObjectValue =
  | string
  | number
  | boolean
  | null
  | ObjectValue[]
  | { [key: string]: ObjectValue };

/**
 * Converts a logical string at a store's serialisation boundary.
 *
 * Both methods are captured once with their receiver. They may return a string
 * or a promise; failures are sanitised by the facade. The key is logical and
 * does not include the platform prefix. Each instance owns its selected pair.
 * Empty strings are passed to `serialize`, and an empty serialised string is
 * valid data when the selected backend can represent it.
 */
export interface ValueSerializer {
  /**
   * Converts a validated string once before the backend write.
   * @param key - The caller's validated logical key.
   * @param value - The logical string, including JSON text for an object operation.
   */
  serialize(key: string, value: string): string | Promise<string>;

  /**
   * Restores a string once after a backend read. Absence bypasses this method.
   * @param key - The caller's validated logical key.
   * @param value - The stored raw backend string.
   */
  deserialize(key: string, value: string): string | Promise<string>;
}

/** Optional instance-scoped transformation used by value facades. */
export interface ValueStoreOptions {
  /**
   * Complete paired conversion, captured at construction without invoking it.
   * Omit it for identity conversion. Partial or malformed pairs are invalid.
   *
   * @defaultValue Identity conversion.
   */
  serializer?: ValueSerializer;
}

/** A minimal raw string backend suitable for read-only facades. */
export interface ValueBackendReader {
  /** Returns the exact stored string, or `null` when the key is absent. */
  get(key: string): string | null | Promise<string | null>;
}

/** A raw string backend supporting reads and replacement writes. */
export interface ValueBackend extends ValueBackendReader {
  /** Stores the exact string for a key. */
  set(key: string, value: string): void | Promise<void>;
}

/** A raw string backend capability which removes a key if it exists. */
export interface ValueBackendDeleter {
  /** Removes a key if it exists. */
  delete(key: string): void | Promise<void>;
}

/** Asynchronous reader for logical strings and parsed JSON values. */
export interface ValueReader {
  /**
   * Returns a logical string, using the supplied default only for absence.
   * The default is validated before I/O, never transformed or stored, and does
   * not replace an empty stored string or a surfaced read failure.
   * @param key - The exact logical key.
   * @param defaultValue - A string to return only when the backend reports absence.
   */
  getValue(key: string, defaultValue: string): Promise<string>;

  /**
   * Returns a logical string, or `null` for absence without a default.
   * Invalid inputs, malformed results, and surfaced backend or serializer failures
   * reject with a fixed ValueStoreError. A decoded empty string remains data.
   */
  getValue(key: string, defaultValue?: string): Promise<string | null>;

  /**
   * Parses stored JSON, using a detached default snapshot only for absence.
   * The default is validated and copied before I/O and is never transformed or
   * stored. Stored JSON null and other falsy data remain values; failures reject.
   * @param key - The exact logical key.
   * @param defaultValue - JSON data to return only when the backend reports absence.
   */
  getObject(key: string, defaultValue: ObjectValue): Promise<ObjectValue>;

  /**
   * Parses the deserialised string as JSON. Without a default, absence is
   * `undefined`; a stored JSON null is `null`. Invalid JSON rejects with
   * `invalid-data` without trying value mode. Returned objects and arrays are
   * independent snapshots.
   */
  getObject(key: string, defaultValue?: ObjectValue): Promise<ObjectValue | undefined>;
}

/** Asynchronous replacement writer for logical strings and JSON values. */
export interface ValueStore extends ValueReader {
  /**
   * Stores a validated logical string through the optional serializer, including
   * an empty string. Await dependent operations; concurrent calls have no
   * invocation-order guarantee, transaction, or automatic retry.
   */
  setValue(key: string, value: string): Promise<void>;

  /**
   * Validates and encodes a JSON snapshot before the first await, then writes
   * through the same serializer as setValue. Top-level false, zero, null, and
   * empty strings remain data. Accessors and toJSON methods are never invoked.
   */
  setObject(key: string, value: ObjectValue): Promise<void>;
}

/** Explicit asynchronous deletion capability. */
export interface ValueDeleter {
  /** Removes a key without passing through the serializer. */
  delete(key: string): Promise<void>;
}

/**
 * One logical mutation in an ordered batch.
 *
 * @remarks
 * Keys are exact logical keys, before any backend prefix is added. Repeated
 * keys are allowed: application observes earlier operations in this batch.
 * Value writes are validated and snapshotted before serialisation or storage
 * application begins.
 */
export type ValueBatchOperation =
  | {
    /** Stores a logical string; the empty string is data. */
    type: "setValue";
    /** Exact logical key, without a backend prefix. */
    key: string;
    /** Logical string passed once through the captured serialiser during preparation. */
    value: string;
    /**
     * When true, applies this write only if the key is absent at application
     * time, including after earlier operations in this batch. The value is
     * still serialised during preparation if this write is later skipped.
     * Omitted or false means replace any present value.
     *
     * @defaultValue `false`.
     */
    ifAbsent?: boolean;
  }
  | {
    /** Stores a supported JSON value as a detached snapshot. */
    type: "setObject";
    /** Exact logical key, without a backend prefix. */
    key: string;
    /** JSON value copied and encoded before the first await. */
    value: ObjectValue;
    /**
     * When true, applies this write only if the key is absent at application
     * time, including after earlier operations in this batch. The encoded value
     * is still serialised during preparation if this write is later skipped.
     * Omitted or false means replace any present value.
     *
     * @defaultValue `false`.
     */
    ifAbsent?: boolean;
  }
  | {
    /** Removes an entry without invoking the serialiser. */
    type: "delete";
    /** Exact logical key, without a backend prefix. */
    key: string;
  };

/** Explicit capability for ordered, fully prepared logical mutations. */
export interface ValueBatchWriter {
  /**
   * Prepares and applies ordered logical mutations through the captured backend.
   *
   * @remarks
   * Snapshots and validates the complete array, its operation fields, and JSON
   * values before the first await. Then prepares each value write through the
   * captured serialiser in array order, before asking the backend to apply any
   * mutation. Conditional writes still invoke the serialiser once even when
   * application skips them. Repeated keys observe earlier operations in this
   * batch. Concurrent calls have no FIFO guarantee.
   *
   * Application is ordered and stops at the first failure. Whether earlier
   * mutations remain visible depends on the backend; this method does not
   * expose an atomicity option or promise rollback. An empty batch performs no
   * data I/O but still observes lifecycle and initialisation failures.
   *
   * @param operations - The ordered logical mutations to validate, prepare, and apply.
   * @returns A promise that fulfils with `undefined` after every mutation reports success.
   * @throws The returned promise rejects with a sanitised `ValueStoreError` on
   * invalid input, serialiser failure, backend failure, or an adapter-specific
   * lifecycle failure. Input and serialiser failures precede this batch's data
   * application; backend failure can follow partial or uncertain effects as
   * documented by the adapter.
   * @example
   * ```ts
   * import { MemoryValueStore } from "@vrtmrz/value-store";
   *
   * const store = new MemoryValueStore();
   * await store.writeBatch([
   *   { type: "setValue", key: "status", value: "ready" },
   *   { type: "setObject", key: "checkpoint", value: { offset: 42 }, ifAbsent: true },
   * ]);
   * await store.dispose();
   * ```
   */
  writeBatch(operations: readonly ValueBatchOperation[]): Promise<void>;
}

/** Explicit capability for removing entries in a backend-defined captured scope. */
export interface ValueClearer {
  /**
   * Removes entries in this instance's captured storage scope.
   *
   * @remarks
   * The concrete adapter defines that scope. Overlapping scopes can share
   * entries. This does not
   * cancel accepted writes that are still preparing, so one can apply after
   * this call completes. Stop and drain producers before using clear as a reset
   * boundary. A failure's effect on earlier removals is backend-specific.
   *
   * @returns A promise that fulfils after the backend reports the scoped clear complete.
   * @throws The returned promise rejects with a sanitised backend or lifecycle
   * error; a rejection does not imply that no entries were removed.
   */
  clear(): Promise<void>;
}

/** Explicit completion of a store's accepted operations and owned resources. */
export interface ValueStoreDisposer {
  /**
   * Permanently stops admission and drains this store's accepted work.
   *
   * @remarks
   * Stops admission synchronously, then waits for every operation already
   * accepted by this facade to settle, including asynchronous serialisation and
   * deserialisation. Later data operations reject with `unavailable`. Disposal
   * does not retry operations or replay their failures, and its success does
   * not certify that each write succeeded; observe each operation's own
   * promise. There is no implicit timeout or cancellation.
   *
   * Every call returns the same terminal promise, including after it has
   * fulfilled or rejected. The adapter documents which resources this facade
   * owns and how shared or borrowed resources are handled; disposal does not
   * imply that other users are drained or an external resource is closed. Do
   * not await this store's disposal from one of its own serialiser callbacks;
   * that operation would be waiting for its own completion.
   *
   * @returns The shared promise that fulfils after accepted work drains and
   * adapter-owned disposal completes.
   * @throws The returned promise can reject with a sanitised lifecycle,
   * initialisation, or resource-release failure after accepted work settles.
   * Ordinary operation failures remain on their original promises.
   */
  dispose(): Promise<void>;
}
