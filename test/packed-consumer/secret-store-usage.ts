/** Compile against the installed package without Node or DOM types. */
import { MemorySecretStore, validateSecretName, createSecretReader } from "@vrtmrz/secret-store";
import { ValueStoreError } from "@vrtmrz/value-store";
import type { SecretReader, SecretStore } from "@vrtmrz/secret-store";
import type { ObjectValue, ValueStoreErrorCode } from "@vrtmrz/value-store";

const reader: SecretReader = createSecretReader({ get: async () => null });
const store: SecretStore = new MemorySecretStore();
const read: Promise<string | null> = reader.getValue("api-token");
const written: Promise<void> = store.setValue("api-token", "");
const object = store.setObject("api-token", { token: "", enabled: false, count: 0, empty: null });
const validated: void = validateSecretName("api-token");
const code: ValueStoreErrorCode = new ValueStoreError("unavailable").code;
void [read, written, validated, code, object];
// @ts-expect-error A read-only provider is not a writable store.
const writable: SecretStore = reader;
// @ts-expect-error Absence is not a stored string.
const value: Promise<string> = reader.getValue("api-token");
// @ts-expect-error Raw backend causes are not public error arguments.
new ValueStoreError("unavailable", { cause: new Error("upstream") });
// @ts-expect-error Internal value validation is not exported.
import { validateSecretValue } from "@vrtmrz/secret-store";

const defaultString: Promise<string> = reader.getValue("missing", "");
const defaultJson = reader.getObject("missing", null);
void [defaultString, defaultJson];
const defaultObject: Promise<ObjectValue> = reader.getObject("missing", false);
void defaultObject;
