import { LocalStorageError, MemoryLocalValueStore } from "@vrtmrz/local-storage";
import type {
  LocalStorageErrorCode,
  ObjectValue,
  ValueSerializer,
  LocalValueReader,
  LocalValueStore,
} from "@vrtmrz/local-storage";
// @ts-expect-error Root validators are internal implementation details.
import { validateLocalKey } from "@vrtmrz/local-storage";
import {
  createWebStorageLocalStore,
  type WebStorageAccess,
  type WebStorageLocalStoreOptions,
} from "@vrtmrz/local-storage/web-storage";
import {
  createCompatibleObsidianLocalStore,
  createObsidianLocalStore,
  type CompatibleObsidianLocalStoreOptions,
  type ObsidianLocalStorage,
} from "@vrtmrz/obsidian-plugin-kit/local-storage";

const memory: LocalValueStore = new MemoryLocalValueStore();
const reader: LocalValueReader = memory;
const readResult: Promise<string | null> = reader.getValue("key");
const objectResult: Promise<ObjectValue | undefined> = reader.getObject("key");
const writeResult: Promise<void> = memory.setValue("key", "");
memory.setObject("options", { text: "", count: 0, enabled: false, items: [null, "value"] });
// @ts-expect-error Undefined is not a JSON value.
memory.setObject("invalid", undefined);
const deleteResult: Promise<void> = memory.delete("key");
const errorCode: LocalStorageErrorCode = new LocalStorageError("invalid-key").code;

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
const webOptions: WebStorageLocalStoreOptions = { prefix: "web/", serializer };
const webStore: LocalValueStore = createWebStorageLocalStore(webStorage, webOptions);

const officialStorage: ObsidianLocalStorage = {
  loadLocalStorage() {
    return null;
  },
  saveLocalStorage() {},
};
const officialStore: LocalValueStore = createObsidianLocalStore(
  officialStorage,
  { prefix: "official/", serializer },
);
const compatibleOptions: CompatibleObsidianLocalStoreOptions = {
  prefix: "compat/",
  legacy: () => ({ storage: webStorage, prefix: "legacy/" }),
};
const compatibleStore: LocalValueStore = createCompatibleObsidianLocalStore(
  officialStorage,
  compatibleOptions,
);

// @ts-expect-error A reader exposes no mutation methods.
reader.setValue("key", "value");
// @ts-expect-error A reader exposes no delete method.
reader.delete("key");
// @ts-expect-error The local value contract has no enumeration.
memory.list();
// @ts-expect-error The local value contract has no clear operation.
memory.clear();
// @ts-expect-error Only fixed public error codes are accepted.
new LocalStorageError("unknown-code");

void [
  readResult,
  objectResult,
  writeResult,
  deleteResult,
  errorCode,
  webStore,
  officialStore,
  compatibleStore,
  validateLocalKey,
];
