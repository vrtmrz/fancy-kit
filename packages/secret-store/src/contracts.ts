import type { SecretStoreError } from "./errors.js";

/** A finite JSON value supported by the secret object methods. */
export type ObjectValue =
  | string
  | number
  | boolean
  | null
  | ObjectValue[]
  | { [key: string]: ObjectValue };

/**
 * Converts string values at the boundary between a secret capability and its
 * backend. Implementations should be instance-scoped and must not expose values
 * through their own errors or logs.
 */
export interface ValueSerializer {
  /**
   * Converts a validated caller string into the backend representation.
   *
   * The method is called once for each successful write operation, after name
   * and input validation and before the backend write. Its receiver is preserved.
   * @param key - The validated secret name.
   * @param value - The validated logical string value.
   */
  serialize(key: string, value: string): string | Promise<string>;

  /**
   * Converts a stored backend string into its logical value.
   *
   * The method is skipped when the backend reports absence, and otherwise called
   * once for each read operation. Its receiver is preserved.
   * @param key - The validated secret name.
   * @param value - The stored backend string.
   */
  deserialize(key: string, value: string): string | Promise<string>;
}

/** Optional instance-scoped value conversion for a secret capability. */
export interface SecretStoreOptions {
  /**
   * A complete serializer pair. When omitted, values pass through unchanged.
   * Supplying a partial or malformed pair rejects construction with
   * {@link SecretStoreError} code `invalid-value`.
   */
  serializer?: ValueSerializer;
}

/** Raw string reads required by the neutral secret facades. */
export interface SecretBackendReader {
  /** Returns a stored raw string, or `null` only when the name is absent. */
  get(name: string): string | null | Promise<string | null>;
}

/** Raw string writes required by a writable neutral secret facade. */
export interface SecretBackend extends SecretBackendReader {
  /** Creates or replaces one raw backend string. */
  set(name: string, value: string): void | Promise<void>;
}

/**
 * Reads named string and JSON-shaped secrets from an explicitly selected
 * backend.
 */
export interface SecretReader {
  /**
   * Returns the exact string value, or `null` only when the entry is absent.
   * Empty strings are data. Stored strings are deserialised when a serializer is
   * configured, and malformed decoded values reject with `invalid-data`.
   * @param name - A portable secret name; never a path or URI.
   */
  getValue(name: string): Promise<string | null>;

  /**
   * Parses a stored value as JSON and returns its validated JSON data. It returns
   * `undefined` only when the entry is absent; a stored JSON `null` is returned
   * as `null`.
   * @param name - A portable secret name; never a path or URI.
   */
  getObject(name: string): Promise<ObjectValue | undefined>;
}

/**
 * Adds create-or-replace writes to {@link SecretReader}.
 *
 * The capability provides no transaction or secure-erasure guarantee. A
 * rejected platform write may already have taken effect; callers must not assume
 * rollback or automatically retry.
 */
export interface SecretStore extends SecretReader {
  /**
   * Creates or replaces an entry with the exact supplied string, including an
   * empty string. Names and caller values are validated before serialisation or
   * a backend operation.
   * @param name - A portable secret name.
   * @param value - A well-formed Unicode string to preserve.
   */
  setValue(name: string, value: string): Promise<void>;

  /**
   * Validates, snapshots, and JSON-encodes a finite JSON-shaped value before
   * asynchronous serialisation or a backend write. Negative zero is
   * represented as JSON zero.
   * @param name - A portable secret name.
   * @param value - JSON data; accessors, class instances, sparse arrays, and
   *   cyclic structures are rejected without invoking getters or `toJSON`.
   */
  setObject(name: string, value: ObjectValue): Promise<void>;
}
