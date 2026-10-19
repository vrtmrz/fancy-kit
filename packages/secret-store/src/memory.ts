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

  /** Returns stored text, using the supplied default only for absence. */
  getValue(name: string, defaultValue: string): Promise<string>;
  /** Returns stored text, or null when neither an entry nor a default is supplied. */
  getValue(name: string, defaultValue?: string): Promise<string | null>;
  getValue(name: string, defaultValue?: string): Promise<string | null> {
    return this.#store.getValue(name, defaultValue);
  }

  /** Returns parsed JSON, using a detached default snapshot only for absence. */
  getObject(name: string, defaultValue: ObjectValue): Promise<ObjectValue>;
  /** Returns parsed JSON, or undefined when no entry or default is supplied. */
  getObject(name: string, defaultValue?: ObjectValue): Promise<ObjectValue | undefined>;
  getObject(name: string, defaultValue?: ObjectValue): Promise<ObjectValue | undefined> {
    return this.#store.getObject(name, defaultValue);
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
