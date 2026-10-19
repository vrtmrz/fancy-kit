import {
  createDeletableValueStore,
  createValueReader,
  createValueStore,
  ValueStoreError,
  MemoryValueStore,
} from "../src/index.js";
import type {
  ValueBackend,
  ValueBackendDeleter,
  ValueBackendReader,
  ValueDeleter,
  ValueReader,
  ValueStore,
  ObjectValue,
  ValueSerializer,
} from "../src/index.js";
import { createWebStorageValueStore } from "../src/web-storage.js";

const serializer: ValueSerializer = {
  serialize: (_key, value) => `wire:${value}`,
  deserialize: (_key, value) => value.slice("wire:".length),
};
const store: ValueStore = new MemoryValueStore({ serializer });
const deletableStore: ValueStore & ValueDeleter = new MemoryValueStore({ serializer });
const reader: ValueReader = store;
const valueResult: Promise<string | null> = reader.getValue("key");
const objectResult: Promise<ObjectValue | undefined> = reader.getObject("key");
const setValueResult: Promise<void> = store.setValue("key", "value");
const setObjectResult: Promise<void> = store.setObject("key", { nested: [false, 0, ""] });
const deleteResult: Promise<void> = deletableStore.delete("key");
const code: ValueStoreError["code"] = "invalid-key";

const backendReader: ValueBackendReader = {
  get: async (_key) => null,
};
const backend: ValueBackend = {
  get: (_key) => null,
  set: (_key, _value) => undefined,
};
const backendDeleter: ValueBackendDeleter = {
  delete: (_key) => undefined,
};
const readerFacade: ValueReader = createValueReader(backendReader, { serializer });
const storeFacade: ValueStore = createValueStore(backend, { serializer });
const deletableFacade: ValueStore & ValueDeleter = createDeletableValueStore(
  { ...backend, ...backendDeleter },
  { serializer },
);
const webStore: ValueStore & ValueDeleter = createWebStorageValueStore({
  getItem: (_key) => null,
  setItem: (_key, _value) => undefined,
  removeItem: (_key) => undefined,
}, { prefix: "literal:", serializer });

// @ts-expect-error A reader does not expose mutation methods.
reader.setValue("key", "value");
// @ts-expect-error A reader does not expose deletion.
reader.delete("key");
// @ts-expect-error A value store does not expose deletion.
store.delete("key");
// @ts-expect-error The writable raw capability requires only get and set.
createDeletableValueStore(backend, { serializer });
// @ts-expect-error Enumeration is not part of the value-store contract.
store.list();
// @ts-expect-error Clearing is not part of the value-store contract.
store.clear();
// @ts-expect-error The root barrel does not expose private validators.
import { validateValueKey } from "../src/index.js";
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
  deletableFacade,
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
const concreteMemory = new MemoryValueStore();
const concreteDefault: Promise<string> = concreteMemory.getValue("missing", "");
void [assumedString, concreteDefault];
