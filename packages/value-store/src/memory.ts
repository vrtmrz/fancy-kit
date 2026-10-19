import type { ValueDeleter, ValueStore, ValueStoreOptions, ObjectValue } from "./contracts.js";
import { createDeletableValueStore } from "./store.js";

/** Instance-owned asynchronous raw string storage for tests and ephemeral state. */
export class MemoryValueStore implements ValueStore, ValueDeleter {
  readonly #entries = new Map<string, string>();
  readonly #store: ValueStore & ValueDeleter;

  /** Creates an empty memory store with an optional instance-scoped serializer. */
  constructor(options?: ValueStoreOptions) {
    this.#store = createDeletableValueStore({
      get: (key) => this.#entries.get(key) ?? null,
      set: (key, value) => { this.#entries.set(key, value); },
      delete: (key) => { this.#entries.delete(key); },
    }, options);
  }

  /** Returns stored text, using the supplied default only for absence. */
  getValue(key: string, defaultValue: string): Promise<string>;
  /** Returns stored text, or null when neither an entry nor a default is supplied. */
  getValue(key: string, defaultValue?: string): Promise<string | null>;
  getValue(key: string, defaultValue?: string): Promise<string | null> {
    return this.#store.getValue(key, defaultValue);
  }

  /** Returns parsed JSON, using a detached default snapshot only for absence. */
  getObject(key: string, defaultValue: ObjectValue): Promise<ObjectValue>;
  /** Returns parsed JSON, or undefined when no entry or default is supplied. */
  getObject(key: string, defaultValue?: ObjectValue): Promise<ObjectValue | undefined>;
  getObject(key: string, defaultValue?: ObjectValue): Promise<ObjectValue | undefined> {
    return this.#store.getObject(key, defaultValue);
  }

  setValue(key: string, value: string): Promise<void> {
    return this.#store.setValue(key, value);
  }

  setObject(key: string, value: ObjectValue): Promise<void> {
    return this.#store.setObject(key, value);
  }

  delete(key: string): Promise<void> {
    return this.#store.delete(key);
  }
}
