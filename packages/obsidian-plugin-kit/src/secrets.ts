import { SecretStoreError, createSecretStore } from "@vrtmrz/secret-store";
import type { SecretStore, SecretStoreOptions } from "@vrtmrz/secret-store";

/**
 * The synchronous subset of Obsidian SecretStorage used by this adapter.
 *
 * Pass `app.secretStorage` at the plug-in composition root, or inject a fake for
 * application tests. The host owns persistence and namespace sharing. No `App`,
 * listing capability, or access to Obsidian's internal storage is required.
 */
export interface ObsidianSecretStorage {
  /**
   * Returns the exact stored raw string, including empty values, or `null` if absent.
   * @param name - A validated portable secret name.
   */
  getSecret(name: string): string | null;
  /**
   * Synchronously creates or replaces an entry under the host's persistence rules.
   * @param name - A validated portable secret name.
   * @param value - The exact raw string to store.
   */
  setSecret(name: string, value: string): void;
}

/**
 * Adapts an explicitly supplied Obsidian SecretStorage to the neutral contract.
 *
 * SecretStorage requires Obsidian 1.11.4 or later. Construction captures both
 * host methods without reading or writing entries. Each returned adapter retains
 * only its supplied host; it never discovers an App, selects a fallback, or logs
 * values. Host methods remain bound to their receiver and are called once per
 * backend operation. The asynchronous store facade validates and handles string
 * and object values, including an optional instance-scoped serializer.
 *
 * Obsidian owns persistence and sharing; this adapter adds no encryption,
 * synchronisation, isolation, or disk-durability guarantee. A rejected write
 * does not imply rollback or a safe retry.
 *
 * @param storage - The synchronous host capability, normally `app.secretStorage`.
 * @param options - Optional value serialisation for this store instance.
 * @returns An asynchronous reader and replacement writer with no delete or list capability.
 * @throws {@link SecretStoreError} with `unavailable` when required methods are
 * missing, or `operation-failed` if reading host methods throws.
 */
export function createObsidianSecretStore(
  storage: ObsidianSecretStorage | null | undefined,
  options?: SecretStoreOptions,
): SecretStore {
  let getSecret: ObsidianSecretStorage["getSecret"] | undefined;
  let setSecret: ObsidianSecretStorage["setSecret"] | undefined;
  try {
    getSecret = storage?.getSecret;
    setSecret = storage?.setSecret;
  } catch {
    throw new SecretStoreError("operation-failed");
  }
  if (typeof getSecret !== "function" || typeof setSecret !== "function") {
    throw new SecretStoreError("unavailable");
  }

  return createSecretStore({
    get(name) {
      return getSecret.call(storage, name);
    },
    set(name, value) {
      setSecret.call(storage, name, value);
    },
  }, options);
}
