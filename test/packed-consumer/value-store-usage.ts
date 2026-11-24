import { createDeletableValueStore, createValueReader, createValueStore, MemoryValueStore, ValueStoreError } from "@vrtmrz/value-store";
import type {
  ValueStoreErrorCode,
  ObjectValue,
  ValueSerializer,
  ValueReader,
  ValueStore,
  ValueDeleter,
  ValueBackend,
  ValueBackendReader,
  ValueBackendDeleter,
  ValueStoreOptions,
  ValueKeyLister,
  ValueKeyListOptions,
} from "@vrtmrz/value-store";
// @ts-expect-error Root validators are internal implementation details.
import { validateValueKey } from "@vrtmrz/value-store";
import {
  createWebStorageValueStore,
  type WebStorageAccess,
  type WebStorageValueStoreOptions,
} from "@vrtmrz/value-store/web-storage";
import {
  createCompatibleObsidianLocalStore,
  createObsidianLocalStore,
  type CompatibleObsidianLocalStoreOptions,
  type ObsidianLocalStorage,
} from "@vrtmrz/obsidian-plugin-kit/local-storage";

const backendEntries = new Map<string, string>();
const backendReader: ValueBackendReader = {
  get: (key) => backendEntries.get(key) ?? null,
};
const backend: ValueBackend = {
  ...backendReader,
  set: (key, value) => { backendEntries.set(key, value); },
};
const backendDeleter: ValueBackendDeleter = {
  delete: (key) => { backendEntries.delete(key); },
};
const factoryReader: ValueReader = createValueReader(backendReader);
const factoryStore: ValueStore = createValueStore(backend);
const deletableFactoryStore: ValueStore & ValueDeleter = createDeletableValueStore({
  ...backend,
  ...backendDeleter,
});
// @ts-expect-error The ordinary store factory does not add deletion.
factoryStore.delete("key");
const memory: ValueStore & ValueDeleter = new MemoryValueStore();
const keyLister: ValueKeyLister = new MemoryValueStore();
const keyListOptions: ValueKeyListOptions = { prefix: "scope:", lower: "a", upper: "z", upperExclusive: true, limit: 4 };
const listedKeys: Promise<string[]> = keyLister.listKeys(keyListOptions);
const reader: ValueReader = memory;
const readResult: Promise<string | null> = reader.getValue("key");
const objectResult: Promise<ObjectValue | undefined> = reader.getObject("key");
const writeResult: Promise<void> = memory.setValue("key", "");
memory.setObject("options", { text: "", count: 0, enabled: false, items: [null, "value"] });
// @ts-expect-error Undefined is not a JSON value.
memory.setObject("invalid", undefined);
const deleteResult: Promise<void> = memory.delete("key");
const errorCode: ValueStoreErrorCode = new ValueStoreError("invalid-key").code;

const webEntries = new Map<string, string>();
const webStorage: WebStorageAccess = {
  getItem(key) {
    return webEntries.get(key) ?? null;
  },
  setItem(key, value) {
    webEntries.set(key, value);
  },
  removeItem(key) {
    webEntries.delete(key);
  },
};
const serializer: ValueSerializer = {
  serialize: async (_key, value) => value,
  deserialize: (_key, value) => value,
};
const storeOptions: ValueStoreOptions = { serializer };
const webOptions: WebStorageValueStoreOptions = { prefix: "web/", ...storeOptions };
const inferredWebStore = createWebStorageValueStore(webStorage, webOptions);
const webStore: ValueStore & ValueDeleter = inferredWebStore;

const officialStorage: ObsidianLocalStorage = {
  loadLocalStorage() {
    return null;
  },
  saveLocalStorage() {},
};
const inferredOfficialStore = createObsidianLocalStore(
  officialStorage,
  { prefix: "official/", serializer },
);
const officialStore: ValueStore & ValueDeleter = inferredOfficialStore;
const compatibleOptions: CompatibleObsidianLocalStoreOptions = {
  prefix: "compat/",
  legacy: () => ({ storage: webStorage, prefix: "legacy/" }),
};
const inferredCompatibleStore = createCompatibleObsidianLocalStore(
  officialStorage,
  compatibleOptions,
);
const compatibleStore: ValueStore & ValueDeleter = inferredCompatibleStore;

// @ts-expect-error Readers do not expose key listing.
reader.listKeys();
// @ts-expect-error ValueStore does not expose key listing.
factoryStore.listKeys();
// @ts-expect-error ValueStore and ValueDeleter do not expose key listing.
deletableFactoryStore.listKeys();
// @ts-expect-error Web Storage does not expose key listing.
inferredWebStore.listKeys();
// @ts-expect-error Obsidian local storage does not expose key listing.
inferredOfficialStore.listKeys();
// @ts-expect-error Compatible Obsidian local storage does not expose key listing.
inferredCompatibleStore.listKeys();

// @ts-expect-error A reader exposes no mutation methods.
reader.setValue("key", "value");
// @ts-expect-error A reader exposes no delete method.
reader.delete("key");
// @ts-expect-error The value-store contract has no enumeration.
memory.list();
// @ts-expect-error The value-store contract has no clear operation.
memory.clear();
// @ts-expect-error Only fixed public error codes are accepted.
new ValueStoreError("unknown-code");

void [
  readResult,
  listedKeys,
  objectResult,
  writeResult,
  deleteResult,
  errorCode,
  webStore,
  officialStore,
  compatibleStore,
  validateValueKey,
  factoryReader,
  factoryStore,
  deletableFactoryStore,
];

const defaultString: Promise<string> = reader.getValue("missing", "");
const defaultJson = reader.getObject("missing", null);
void [defaultString, defaultJson];
const defaultObject: Promise<ObjectValue> = reader.getObject("missing", false);
void defaultObject;
