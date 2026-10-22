import type { ObjectValue, ValueStore, ValueDeleter } from "@vrtmrz/value-store";
import { createJsonFileValueStore, type JsonFileValueStoreOptions } from "@vrtmrz/value-store/node-json-file";

const options: JsonFileValueStoreOptions = {
  filePath: "consumer-owned/local-storage.json",
  prefix: "plugin:",
  serializer: { serialize: async (_key, value) => value, deserialize: (_key, value) => value },
};
const store: ValueStore & ValueDeleter = createJsonFileValueStore(options);
const result: Promise<string | null> = store.getValue("key");
const object: Promise<ObjectValue | undefined> = store.getObject("key");
const setResult: Promise<void> = store.setValue("key", "");
const deleteResult: Promise<void> = store.delete("key");

// @ts-expect-error Node file storage requires an explicit destination.
createJsonFileValueStore({ prefix: "plugin:" });
// @ts-expect-error Value writes are asynchronous.
const synchronousWrite: void = store.setValue("key", "value");
// @ts-expect-error Value mode accepts strings only.
store.setValue("key", { value: 1 });
void [result, object, setResult, deleteResult, synchronousWrite];

const defaultString: Promise<string> = store.getValue("missing", "");
const defaultJson = store.getObject("missing", null);
void [defaultString, defaultJson];
const defaultObject: Promise<ObjectValue> = store.getObject("missing", false);
void defaultObject;
