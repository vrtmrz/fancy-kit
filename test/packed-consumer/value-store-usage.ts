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
const webStore: ValueStore & ValueDeleter = createWebStorageValueStore(webStorage, webOptions);

const officialStorage: ObsidianLocalStorage = {
  loadLocalStorage() {
    return null;
  },
  saveLocalStorage() {},
};
const officialStore: ValueStore & ValueDeleter = createObsidianLocalStore(
  officialStorage,
  { prefix: "official/", serializer },
);
const compatibleOptions: CompatibleObsidianLocalStoreOptions = {
  prefix: "compat/",
  legacy: () => ({ storage: webStorage, prefix: "legacy/" }),
};
const compatibleStore: ValueStore & ValueDeleter = createCompatibleObsidianLocalStore(
  officialStorage,
  compatibleOptions,
);

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
