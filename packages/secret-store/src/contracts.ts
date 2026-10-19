import type { ObjectValue, ValueSerializer, ValueStoreError } from "@vrtmrz/value-store";

export type { ObjectValue, ValueSerializer } from "@vrtmrz/value-store";

/** Optional instance-scoped value conversion for a secret capability. */
export interface SecretStoreOptions {
  /**
   * A complete serializer pair. When omitted, values pass through unchanged.
   * Supplying a partial or malformed pair rejects construction with
   * {@link ValueStoreError} code `invalid-value`.
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
   * Returns the exact string, using a supplied default only for absence.
   * The default follows the string-value rules and is validated before I/O.
   * It is never transformed or stored; empty stored strings and failures retain
   * their usual behaviour.
   * @param name - A portable secret name; never a path or URI.
   * @param defaultValue - A well-formed Unicode string for an absent entry.
   */
  getValue(name: string, defaultValue: string): Promise<string>;

  /**
   * Returns the exact string value, or `null` for absence without a default.
   * Empty strings are data. Stored strings are deserialised when a serializer is
   * configured, and malformed decoded values reject with `invalid-data`.
   * @param name - A portable secret name; never a path or URI.
   */
  getValue(name: string, defaultValue?: string): Promise<string | null>;

  /**
   * Parses stored JSON, using a detached default snapshot only for absence.
   * The default is validated and copied before I/O and is never transformed or
   * stored. Stored JSON null and other falsy data remain values; failures reject.
   * @param name - A portable secret name; never a path or URI.
   * @param defaultValue - JSON data to return only for an absent entry.
   */
  getObject(name: string, defaultValue: ObjectValue): Promise<ObjectValue>;

  /**
   * Parses a stored value as JSON and returns its validated JSON data. It returns
   * `undefined` for absence without a default; a stored JSON `null` is returned
   * as `null`.
   * @param name - A portable secret name; never a path or URI.
   */
  getObject(name: string, defaultValue?: ObjectValue): Promise<ObjectValue | undefined>;
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
