import type { SecretStoreOptions } from "@vrtmrz/secret-store";
import type { ValueSerializer, ValueStoreOptions } from "@vrtmrz/value-store";
import { createOwHkdfSerializer } from "../../examples/value-stores/ow-hkdf-serializer.js";

const serializer: ValueSerializer = createOwHkdfSerializer(async () => "example-passphrase");
const valueOptions: ValueStoreOptions = { serializer };
const secretOptions: SecretStoreOptions = { serializer };
void [valueOptions, secretOptions];
