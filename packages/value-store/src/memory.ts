import type { ValueBatchOperation, ValueBatchWriter, ValueClearer, ValueDeleter, ValueStore, ValueStoreDisposer, ValueStoreOptions, ObjectValue } from "./contracts.js";
import { createEnhancedValueStore, type EnhancedValueStore } from "./enhanced-store.js";

/**
 * Instance-owned in-memory string storage for tests and ephemeral state.
 *
 * @remarks
 * Each instance has an independent map. Value operations use the shared
 * serialiser, absence, validation, and snapshot contracts. A batch prepares
 * every value first, applies its ordered mutations to a candidate map, then
 * publishes that map in one synchronous assignment; failed preparation or
 * application leaves the current map intact. Calls made concurrently have no
 * FIFO guarantee. `clear()` affects only this instance, and `dispose()` closes
 * admission permanently without clearing its map.
 */
export class MemoryValueStore implements ValueStore, ValueDeleter, ValueBatchWriter, ValueClearer, ValueStoreDisposer {
  #entries = new Map<string, string>();
  readonly #store: EnhancedValueStore & ValueClearer;

  /**
   * Creates an empty memory store with an optional instance-scoped serialiser.
   *
   * @remarks
   * The serialiser pair and its receiver are captured without invoking either
   * method.
   *
   * @param options - Optional complete serialiser pair; omitted means identity conversion.
   * @throws `ValueStoreError` is thrown synchronously when the supplied options do
   * not contain a valid complete serialiser pair.
   */
  constructor(options?: ValueStoreOptions) {
    this.#store = createEnhancedValueStore({
      get: (key) => this.#entries.get(key) ?? null,
      set: (key, value) => { this.#entries.set(key, value); },
      delete: (key) => { this.#entries.delete(key); },
      writeBatch: (operations) => {
        if (operations.length === 0) return;
        // The map is the storage itself; publish its candidate only after ordered application succeeds.
        const candidate = new Map(this.#entries);
        for (const operation of operations) {
          if (operation.type === "delete") candidate.delete(operation.key);
          else if (!operation.ifAbsent || !candidate.has(operation.key)) candidate.set(operation.key, operation.value);
        }
        this.#entries = candidate;
      },
      clear: () => { this.#entries.clear(); },
    }, options);
  }

  /**
   * Reads and deserialises a string, returning `defaultValue` only when the key
   * is absent. A stored empty string remains data and overrides the default.
   * The default is validated before I/O and is neither serialised nor stored.
   * @param key - Exact logical key.
   * @param defaultValue - Validated string returned only for absence.
   * @returns A promise resolving to the deserialised string or the supplied default.
   * @throws The returned promise rejects with `ValueStoreError` for invalid
   * input or a read or deserialisation failure.
   */
  getValue(key: string, defaultValue: string): Promise<string>;
  /**
   * Reads and deserialises a string, returning `null` when absent and no default
   * is supplied. A stored empty string remains data.
   * @param key - Exact logical key.
   * @param defaultValue - Optional validated string returned only for absence.
   * @returns A promise resolving to a string, the supplied default, or `null` for absence.
   * @throws The returned promise rejects with `ValueStoreError` for invalid
   * input or a read or deserialisation failure.
   */
  getValue(key: string, defaultValue?: string): Promise<string | null>;
  getValue(key: string, defaultValue?: string): Promise<string | null> {
    return this.#store.getValue(key, defaultValue);
  }

  /**
   * Reads and parses stored JSON, returning a detached snapshot of
   * `defaultValue` only when the key is absent. Stored JSON `null`, `false`,
   * zero, and empty strings remain data.
   * @param key - Exact logical key.
   * @param defaultValue - Supported JSON value copied before the read and returned only for absence.
   * @returns A promise resolving to the parsed value or detached default snapshot.
   * @throws The returned promise rejects with `ValueStoreError` for invalid
   * input, invalid JSON, or a read or deserialisation failure.
   */
  getObject(key: string, defaultValue: ObjectValue): Promise<ObjectValue>;
  /**
   * Reads and parses stored JSON, returning `undefined` only when the key is
   * absent and no default is supplied. Stored JSON `null` remains `null`.
   * Returned objects and arrays are detached snapshots.
   * @param key - Exact logical key.
   * @param defaultValue - Optional supported JSON value copied before the read and returned only for absence.
   * @returns A promise resolving to parsed data, a detached default, or `undefined` for absence.
   * @throws The returned promise rejects with `ValueStoreError` for invalid
   * input, invalid JSON, or a read or deserialisation failure.
   */
  getObject(key: string, defaultValue?: ObjectValue): Promise<ObjectValue | undefined>;
  getObject(key: string, defaultValue?: ObjectValue): Promise<ObjectValue | undefined> {
    return this.#store.getObject(key, defaultValue);
  }

  /**
   * Stores a logical string through the captured serialiser. The empty string
   * is stored as data. Await dependent calls; concurrent calls have no FIFO
   * guarantee.
   * @param key - Exact logical key.
   * @param value - Logical string to store.
   * @returns A promise that fulfils after the value is stored in this instance's map.
   * @throws The returned promise rejects with `ValueStoreError` for invalid
   * input, serialiser failure, or a backend failure.
   */
  setValue(key: string, value: string): Promise<void> {
    return this.#store.setValue(key, value);
  }

  /**
   * Validates, encodes, and stores a detached JSON snapshot through the
   * captured serialiser. Accessors and `toJSON` methods are not invoked.
   * @param key - Exact logical key.
   * @param value - Supported JSON value to snapshot and store.
   * @returns A promise that fulfils after the encoded value is stored in this instance's map.
   * @throws The returned promise rejects with `ValueStoreError` for invalid
   * input, serialiser failure, or a backend failure.
   */
  setObject(key: string, value: ObjectValue): Promise<void> {
    return this.#store.setObject(key, value);
  }

  /**
   * Removes a key from this instance's map without invoking the serialiser.
   * @param key - Exact logical key to remove.
   * @returns A promise that fulfils after the key is absent from this instance's map.
   * @throws The returned promise rejects with `ValueStoreError` for invalid
   * input or a backend failure.
   */
  delete(key: string): Promise<void> {
    return this.#store.delete(key);
  }

  /**
   * Validates and snapshots all operations before the first await, then
   * serialises value writes in order before building a candidate map. Repeated
   * keys observe earlier operations in the batch, and `ifAbsent` is checked
   * during application; a conditional value is still serialised if skipped.
   * The candidate is published in one synchronous assignment after ordered
   * application succeeds, so preparation or application failure leaves the
   * current map unchanged. An empty batch does no map I/O but still observes
   * disposal state. Concurrent calls have no FIFO guarantee.
   * @param operations - Ordered logical mutations to apply.
   * @returns A promise that fulfils after this batch's application completes.
   * @throws The returned promise rejects with `ValueStoreError` for invalid
   * input, serialiser failure, or a backend failure; failed preparation does
   * not change the map.
   */
  writeBatch(operations: readonly ValueBatchOperation[]): Promise<void> {
    return this.#store.writeBatch(operations);
  }

  /**
   * Removes every entry from this instance's map; other memory stores are
   * unaffected. A write accepted earlier but still preparing is not cancelled
   * and can apply after this call completes. Stop and drain producers before
   * using this method as a reset boundary.
   * @returns A promise that fulfils after this instance's scoped removal completes.
   * @throws The returned promise rejects with `ValueStoreError` if disposal
   * has already closed admission.
   */
  clear(): Promise<void> {
    return this.#store.clear();
  }

  /**
   * Permanently stops admission synchronously and waits for this store's
   * already accepted operations, including asynchronous serialisation and
   * deserialisation, to settle. It does not clear the map or replay operation
   * failures; inspect each operation's own promise. Later data operations reject with
   * `unavailable`. Repeated calls return the same terminal promise. Do not
   * await disposal from this store's own serialiser.
   * @returns The shared promise that fulfils after accepted work settles.
   * Memory disposal has no external resource cleanup; ordinary operation
   * failures remain on their original promises.
   */
  dispose(): Promise<void> {
    return this.#store.dispose();
  }
}
