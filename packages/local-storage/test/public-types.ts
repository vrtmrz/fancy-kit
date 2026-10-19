import {
  createLocalValueReader,
  createLocalValueStore,
  LocalStorageError,
  MemoryLocalValueStore,
} from "../src/index.js";
import type {
  LocalValueBackend,
  LocalValueBackendReader,
  LocalValueReader,
  LocalValueStore,
  ObjectValue,
  ValueSerializer,
} from "../src/index.js";
import { createWebStorageLocalStore } from "../src/web-storage.js";

const serializer: ValueSerializer = {
  serialize: (_key, value) => `wire:${value}`,
  deserialize: (_key, value) => value.slice("wire:".length),
};
const store: LocalValueStore = new MemoryLocalValueStore({ serializer });
const reader: LocalValueReader = store;
const valueResult: Promise<string | null> = reader.getValue("key");
const objectResult: Promise<ObjectValue | undefined> = reader.getObject("key");
const setValueResult: Promise<void> = store.setValue("key", "value");
const setObjectResult: Promise<void> = store.setObject("key", { nested: [false, 0, ""] });
const deleteResult: Promise<void> = store.delete("key");
const code: LocalStorageError["code"] = "invalid-key";

const backendReader: LocalValueBackendReader = {
  get: async (_key) => null,
};
const backend: LocalValueBackend = {
  get: (_key) => null,
  set: (_key, _value) => undefined,
  delete: (_key) => undefined,
};
const readerFacade: LocalValueReader = createLocalValueReader(backendReader, { serializer });
const storeFacade: LocalValueStore = createLocalValueStore(backend, { serializer });
const webStore: LocalValueStore = createWebStorageLocalStore({
  getItem: (_key) => null,
  setItem: (_key, _value) => undefined,
  removeItem: (_key) => undefined,
}, { prefix: "literal:", serializer });

// @ts-expect-error A reader does not expose mutation methods.
reader.setValue("key", "value");
// @ts-expect-error A reader does not expose deletion.
reader.delete("key");
// @ts-expect-error Enumeration is not part of the local storage contract.
store.list();
// @ts-expect-error Clearing is not part of the local storage contract.
store.clear();
// @ts-expect-error The root barrel does not expose private validators.
import { validateLocalKey } from "../src/index.js";
// @ts-expect-error Undefined is not an object JSON value.
store.setObject("key", undefined);
// @ts-expect-error There is no legacy LocalValue alias.
import type { LocalValue } from "../src/index.js";

void [
  valueResult,
  objectResult,
  setValueResult,
  setObjectResult,
  deleteResult,
  code,
  readerFacade,
  storeFacade,
  webStore,
];

const defaultString: Promise<string> = reader.getValue("missing", "");
const defaultObject: Promise<ObjectValue> = reader.getObject("missing", null);
const memoryDefault: Promise<string> = store.getValue("missing", "fallback");
const explicitUndefined: Promise<string | null> = reader.getValue("missing", undefined);
const objectUndefined: Promise<ObjectValue | undefined> = reader.getObject("missing", undefined);
// @ts-expect-error A string default must be a string.
reader.getValue("missing", null);
// @ts-expect-error A JSON default cannot contain undefined.
reader.getObject("missing", { invalid: undefined });
// @ts-expect-error A default does not promise that stored JSON has the same shape.
const assumedObject: Promise<{ count: number }> = reader.getObject("missing", { count: 0 });
void [defaultString, defaultObject, memoryDefault, explicitUndefined, objectUndefined, assumedObject];
// @ts-expect-error Reads without defaults retain the absence sentinel.
const assumedString: Promise<string> = reader.getValue("missing");
const concreteMemory = new MemoryLocalValueStore();
const concreteDefault: Promise<string> = concreteMemory.getValue("missing", "");
void [assumedString, concreteDefault];
