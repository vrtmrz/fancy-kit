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
 */
export interface ValueSerializer {
  /**
   * Converts a validated string once before the backend write. Local empty-string
   * deletion bypasses this method. A non-empty value must produce a non-empty string.
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

/** Optional instance-scoped transformation used by local-value facades. */
export interface LocalValueStoreOptions {
  /**
   * Complete paired conversion, captured at construction without invoking it.
   * Omit it for identity conversion. Partial or malformed pairs are invalid.
   */
  serializer?: ValueSerializer;
}

/** A minimal raw string backend suitable for read-only facades. */
export interface LocalValueBackendReader {
  /** Returns the exact stored string, or `null` when the key is absent. */
  get(key: string): string | null | Promise<string | null>;
}

/** A raw string backend supporting replacement and deletion. */
export interface LocalValueBackend extends LocalValueBackendReader {
  /** Stores the exact string for a key. */
  set(key: string, value: string): void | Promise<void>;

  /** Removes a key if it exists. */
  delete(key: string): void | Promise<void>;
}

/** Asynchronous reader for logical strings and parsed JSON values. */
export interface LocalValueReader {
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
   * reject with a fixed LocalStorageError. A decoded empty string remains data.
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
   * `undefined`; a stored JSON
   * null is `null`. Invalid JSON rejects with `invalid-data` without trying value mode.
   * Returned objects and arrays are independent snapshots.
   */
  getObject(key: string, defaultValue?: ObjectValue): Promise<ObjectValue | undefined>;
}

/** Asynchronous local-value writer with explicit deletion. */
export interface LocalValueStore extends LocalValueReader {
  /**
   * Stores a validated logical string through the optional serializer. An empty
   * string deletes before serialisation. Await dependent operations; concurrent
   * calls have no invocation-order guarantee, transaction, or automatic retry.
   */
  setValue(key: string, value: string): Promise<void>;

  /**
   * Validates and encodes a JSON snapshot before the first await, then writes
   * through the same serializer as setValue. Top-level false, zero, null, and
   * empty strings remain data. Accessors and toJSON methods are never invoked.
   */
  setObject(key: string, value: ObjectValue): Promise<void>;

  /** Removes a key without passing through the serializer. */
  delete(key: string): Promise<void>;
}
