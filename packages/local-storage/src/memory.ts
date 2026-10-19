import type { LocalValueStore, LocalValueStoreOptions, ObjectValue } from "./contracts.js";
import { createLocalValueStore } from "./store.js";

/** Instance-owned asynchronous raw string storage for tests and ephemeral state. */
export class MemoryLocalValueStore implements LocalValueStore {
  readonly #entries = new Map<string, string>();
  readonly #store: LocalValueStore;

  /** Creates an empty memory store with an optional instance-scoped serializer. */
  constructor(options?: LocalValueStoreOptions) {
    this.#store = createLocalValueStore({
      get: (key) => this.#entries.get(key) ?? null,
      set: (key, value) => { this.#entries.set(key, value); },
      delete: (key) => { this.#entries.delete(key); },
    }, options);
  }

  getValue(key: string): Promise<string | null> {
    return this.#store.getValue(key);
  }

  getObject(key: string): Promise<ObjectValue | undefined> {
    return this.#store.getObject(key);
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
