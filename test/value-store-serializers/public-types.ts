import type { ValueSerializer as LocalSerializer } from "@vrtmrz/local-storage";
import type { ValueSerializer as SecretSerializer } from "@vrtmrz/secret-store";
import { createOwHkdfSerializer } from "../../examples/value-stores/ow-hkdf-serializer.js";

const local: LocalSerializer = createOwHkdfSerializer(async () => "example-passphrase");
const secret: SecretSerializer = local;
const localAgain: LocalSerializer = secret;
void localAgain;
