import { createDeletableValueStore, ValueStoreError } from "@vrtmrz/value-store";
import type {
  ValueDeleter,
  ValueStore,
  ValueStoreOptions,
} from "@vrtmrz/value-store";
import { createWebStorageValueStore } from "@vrtmrz/value-store/web-storage";
import type { WebStorageAccess } from "@vrtmrz/value-store/web-storage";

/**
 * The synchronous Obsidian App local-storage methods used by this adapter.
 *
 * These methods operate in the active Vault's local-storage scope. Supply them
 * explicitly, normally from an App instance. This adapter does not discover an
 * App or derive Vault scope.
 */
export interface ObsidianLocalStorage {
  /**
   * Reads a raw string from the App's Vault-scoped local storage.
   * @param key - The key after the prefix supplied in {@link ObsidianLocalStoreOptions}.
   * @returns The stored string, or `null` when absent.
   */
  loadLocalStorage(key: string): string | null;
  /**
   * Writes or deletes a raw string in the App's Vault-scoped local storage.
   * Passing null deletes the key. Obsidian also treats an empty string as
   * deletion, so this adapter rejects empty physical outputs before the host call.
   * @param key - The key after the prefix supplied in {@link ObsidianLocalStoreOptions}.
   * @param value - The raw string to store, or `null` to delete the key.
   */
  saveLocalStorage(key: string, value: string | null): void;
}

/** Options for adapting Obsidian's host-owned local storage. */
export interface ObsidianLocalStoreOptions extends ValueStoreOptions {
  /**
   * The complete caller prefix within the App's Vault-scoped local storage.
   * The App owns Vault scoping; this adapter appends the caller key literally.
   */
  prefix: string;
}

/** A caller-supplied legacy Web Storage source for compatibility access. */
export interface LegacyLocalStoreSource {
  /**
   * The explicitly supplied Web Storage methods.
   * @see {@link https://developer.mozilla.org/docs/Web/API/Storage}
   */
  storage: WebStorageAccess;
  /**
   * The complete raw legacy prefix, including any Vault, plug-in, and delimiter text.
   * It is passed unchanged to the Web Storage adapter.
   */
  prefix: string;
}

/** Options for explicit official-or-legacy Obsidian storage selection. */
export interface CompatibleObsidianLocalStoreOptions extends ObsidianLocalStoreOptions {
  /**
   * Lazily supplies the legacy Web Storage source when both official methods are absent.
   * It is never read or called when both official methods are available.
   */
  legacy?: () => LegacyLocalStoreSource;
}

type OfficialMethods = {
  loadLocalStorage: unknown;
  saveLocalStorage: unknown;
};

function readPrefix(options: ObsidianLocalStoreOptions): string {
  let prefix: unknown;
  try {
    prefix = (options as { prefix?: unknown } | null | undefined)?.prefix;
  } catch {
    throw new ValueStoreError("invalid-value");
  }
  if (typeof prefix !== "string") throw new ValueStoreError("invalid-value");
  return prefix;
}

function readValueOptions(options: ValueStoreOptions): ValueStoreOptions {
  let serializer: ValueStoreOptions["serializer"];
  try {
    serializer = options.serializer;
  } catch {
    throw new ValueStoreError("operation-failed");
  }
  return serializer === undefined ? {} : { serializer };
}

function readOfficialMethods(
  storage: Partial<ObsidianLocalStorage> | null | undefined,
): OfficialMethods {
  if (storage === null || storage === undefined) {
    return { loadLocalStorage: undefined, saveLocalStorage: undefined };
  }
  try {
    return {
      loadLocalStorage: storage.loadLocalStorage,
      saveLocalStorage: storage.saveLocalStorage,
    };
  } catch {
    throw new ValueStoreError("operation-failed");
  }
}

function createOfficialStore(
  storage: Partial<ObsidianLocalStorage>,
  loadLocalStorage: ObsidianLocalStorage["loadLocalStorage"],
  saveLocalStorage: ObsidianLocalStorage["saveLocalStorage"],
  prefix: string,
  options: ValueStoreOptions,
): ValueStore & ValueDeleter {
  return createDeletableValueStore({
    get(key) {
      return loadLocalStorage.call(storage, prefix + key);
    },
    set(key, value) {
      if (value === "") throw new ValueStoreError("invalid-value");
      saveLocalStorage.call(storage, prefix + key, value);
    },
    delete(key) {
      saveLocalStorage.call(storage, prefix + key, null);
    },
  }, options);
}

/**
 * Adapts the explicitly supplied Obsidian App local-storage methods.
 *
 * The supplied prefix is complete and Vault-relative; the App owns Vault scoping.
 * The adapter appends caller keys literally and maps deletion to
 * `saveLocalStorage(key, null)`. Construction reads each host method once and
 * performs no storage operation. Calls retain the host receiver. The shared
 * value-store facade handles serialisation, validation, and asynchronous methods.
 * Writes reject an empty physical output with `invalid-value` before calling
 * the host, preserving any previous value.
 * Obsidian may swallow storage failures internally, so the adapter cannot report
 * errors which the host does not expose. No legacy storage is selected, and no
 * migration, enumeration, or clear operation is performed.
 *
 * @param storage - The App methods, normally from the current App instance.
 * @param options - The complete Vault-relative prefix and optional serializer.
 * @returns An asynchronous value store and explicit deleter backed by Obsidian.
 * @throws {@link ValueStoreError} with `invalid-value` for an invalid prefix,
 * `unavailable` when a host method is missing, or
 * `operation-failed` if reading host method properties throws.
 */
export function createObsidianLocalStore(
  storage: ObsidianLocalStorage | null | undefined,
  options: ObsidianLocalStoreOptions,
): ValueStore & ValueDeleter {
  const prefix = readPrefix(options);
  const methods = readOfficialMethods(storage);
  if (
    typeof methods.loadLocalStorage !== "function" ||
    typeof methods.saveLocalStorage !== "function"
  ) {
    throw new ValueStoreError("unavailable");
  }
  return createOfficialStore(
    storage as Partial<ObsidianLocalStorage>,
    methods.loadLocalStorage as ObsidianLocalStorage["loadLocalStorage"],
    methods.saveLocalStorage as ObsidianLocalStorage["saveLocalStorage"],
    prefix,
    readValueOptions(options),
  );
}

function createLegacyStore(options: CompatibleObsidianLocalStoreOptions): ValueStore & ValueDeleter {
  let provider: CompatibleObsidianLocalStoreOptions["legacy"];
  try {
    provider = options.legacy;
  } catch {
    throw new ValueStoreError("operation-failed");
  }
  if (typeof provider !== "function") throw new ValueStoreError("unavailable");

  let source: LegacyLocalStoreSource;
  try {
    source = provider();
  } catch {
    throw new ValueStoreError("operation-failed");
  }

  let storage: unknown;
  let prefix: unknown;
  try {
    storage = (source as LegacyLocalStoreSource | null | undefined)?.storage;
    prefix = (source as LegacyLocalStoreSource | null | undefined)?.prefix;
  } catch {
    throw new ValueStoreError("operation-failed");
  }
  if (typeof prefix !== "string") throw new ValueStoreError("invalid-value");
  if (
    storage === null ||
    storage === undefined ||
    (typeof storage !== "object" && typeof storage !== "function")
  ) {
    throw new ValueStoreError("unavailable");
  }
  const valueOptions = readValueOptions(options);
  return createWebStorageValueStore(storage as WebStorageAccess, {
    prefix,
    ...valueOptions,
  });
}

/**
 * Selects official Obsidian storage or an explicitly supplied legacy Web Storage source.
 *
 * Selection happens once at construction. When both official methods exist, only
 * they are inspected and the `legacy` option is left unread. When both are absent,
 * the lazy provider is called once and its complete raw prefix is passed unchanged
 * to the Web Storage adapter. Official storage rejects an empty physical string
 * with `invalid-value` before the host call; legacy Web Storage can retain it.
 * A partial or malformed official API is rejected as `unavailable`. The selected
 * backend never changes after an operation failure. This factory performs no
 * migration and keeps access to the legacy source explicit. Use
 * {@link createObsidianLocalStore} or `createWebStorageValueStore` directly when a
 * single source is preferred.
 *
 * @param storage - The optional official App methods.
 * @param options - The official prefix, optional serializer, and lazy legacy source.
 * @returns An asynchronous value store and explicit deleter bound to the selected source.
 * @throws {@link ValueStoreError} with `invalid-value` for an invalid prefix,
 * `unavailable` when neither a complete official API nor legacy source is
 * available, or `operation-failed` when reading host methods or invoking the
 * legacy provider fails.
 */
export function createCompatibleObsidianLocalStore(
  storage: Partial<ObsidianLocalStorage> | null | undefined,
  options: CompatibleObsidianLocalStoreOptions,
): ValueStore & ValueDeleter {
  const prefix = readPrefix(options);
  const methods = readOfficialMethods(storage);
  const loadAbsent = methods.loadLocalStorage === undefined;
  const saveAbsent = methods.saveLocalStorage === undefined;

  if (loadAbsent && saveAbsent) return createLegacyStore(options);
  if (
    typeof methods.loadLocalStorage !== "function" ||
    typeof methods.saveLocalStorage !== "function"
  ) {
    throw new ValueStoreError("unavailable");
  }

  return createOfficialStore(
    storage as Partial<ObsidianLocalStorage>,
    methods.loadLocalStorage as ObsidianLocalStorage["loadLocalStorage"],
    methods.saveLocalStorage as ObsidianLocalStorage["saveLocalStorage"],
    prefix,
    readValueOptions(options),
  );
}
