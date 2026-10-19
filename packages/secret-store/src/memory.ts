import type { ObjectValue, SecretStore, SecretStoreOptions } from "./contracts.js";
import { createSecretStore } from "./facade.js";

/**
 * An explicitly chosen, ephemeral secret store for tests and temporary use.
 *
 * Every instance owns a separate map. Values are neither persisted nor logged;
 * there is no fallback backend, expiry, or guaranteed memory erasure. The store
 * imposes no value-size limit beyond the host's memory and string limits.
 */
export class MemorySecretStore implements SecretStore {
  #values = new Map<string, string>();
  #store: SecretStore;

  /** Creates an empty store with no external resources or shared state. */
  constructor(options?: SecretStoreOptions) {
    const values = this.#values;
    this.#store = createSecretStore({
      get: (name) => values.get(name) ?? null,
      set: (name, value) => { values.set(name, value); },
    }, options);
  }

  /** Returns a stored string including `""`, or `null` if absent. */
  getValue(name: string): Promise<string | null> {
    return this.#store.getValue(name);
  }

  /** Returns parsed JSON data, or `undefined` if the entry is absent. */
  getObject(name: string) {
    return this.#store.getObject(name);
  }

  /** Creates or replaces one exact logical string value. */
  setValue(name: string, value: string): Promise<void> {
    return this.#store.setValue(name, value);
  }

  /** Stores a detached JSON snapshot of the supplied value. */
  setObject(name: string, value: ObjectValue): Promise<void> {
    return this.#store.setObject(name, value);
  }
}
