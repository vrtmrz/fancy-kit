import { ValueStoreError } from "@vrtmrz/value-store";
import type { ValueStoreErrorCode } from "@vrtmrz/value-store";
/** Compile-only assertions for the neutral capabilities, options, and error boundary. */
import { createSecretReader, createSecretStore, MemorySecretStore, validateSecretName } from "../src/index.js";
import type { ObjectValue, SecretBackend, SecretBackendReader, SecretReader, SecretStore, SecretStoreOptions, ValueSerializer } from "../src/index.js";

const backend: SecretBackend = { get: async () => null, set: async () => undefined };
const rawReader: SecretBackendReader = { get: () => null };
const serializer: ValueSerializer = {
  serialize: async (_key, value) => value,
  deserialize: async (_key, value) => value,
};
const options: SecretStoreOptions = { serializer };
const reader: SecretReader = createSecretReader(rawReader, options);
const store: SecretStore = createSecretStore(backend, options);
const memory = new MemorySecretStore(options);
const readableStore: SecretReader = store;
const result: Promise<string | null> = reader.getValue("api-token");
const objectResult: Promise<ObjectValue | undefined> = reader.getObject("api-token");
const written: Promise<void> = store.setValue("api-token", "");
const objectWritten: Promise<void> = store.setObject("api-token", { nested: [false, 0, null] });
const memoryRead: Promise<string | null> = memory.getValue("api-token");
const validated: void = validateSecretName("api-token");
const code: ValueStoreErrorCode = new ValueStoreError("unavailable").code;
void [readableStore, result, objectResult, written, objectWritten, memoryRead, validated, code];

// @ts-expect-error A reader does not provide write access.
const invalidStore: SecretStore = reader;
// @ts-expect-error Absence must remain distinguishable from a stored string.
const nonNullable: Promise<string> = reader.getValue("api-token");
// @ts-expect-error Store values are strings, not arbitrary objects.
store.setValue("api-token", {});
// @ts-expect-error A JSON value cannot contain undefined.
store.setObject("api-token", { invalid: undefined });
// @ts-expect-error Raw causes are not part of the error constructor.
new ValueStoreError("unavailable", { cause: new Error("upstream") });
// @ts-expect-error Error codes are a closed set of sanitised categories.
new ValueStoreError("upstream message");
// @ts-expect-error The neutral reader does not expose management capabilities.
reader.list();
// @ts-expect-error A store does not require deletion.
store.delete("api-token");
// @ts-expect-error Value validation is internal, not a public package export.
import { validateSecretValue } from "../src/index.js";

const defaultString: Promise<string> = reader.getValue("missing", "");
const defaultObject: Promise<ObjectValue> = reader.getObject("missing", null);
const memoryDefault: Promise<string> = memory.getValue("missing", "fallback");
const explicitUndefined: Promise<string | null> = reader.getValue("missing", undefined);
const objectUndefined: Promise<ObjectValue | undefined> = reader.getObject("missing", undefined);
// @ts-expect-error A string default must be a string.
reader.getValue("missing", null);
// @ts-expect-error A JSON default cannot contain undefined.
reader.getObject("missing", { invalid: undefined });
// @ts-expect-error A default does not promise that stored JSON has the same shape.
const assumedObject: Promise<{ count: number }> = reader.getObject("missing", { count: 0 });
void [defaultString, defaultObject, memoryDefault, explicitUndefined, objectUndefined, assumedObject];

// Secret profiles share the value operations, but require no deletion capability.
import type { ValueReader, ValueStore, ValueDeleter } from "@vrtmrz/value-store";
const valueReader: ValueReader = reader;
const valueStore: ValueStore = store;
// @ts-expect-error A secret store does not provide deletion.
const deleter: ValueDeleter = store;
void [valueReader, valueStore, deleter];
