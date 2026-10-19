import type { SecretReader, SecretStore } from "@vrtmrz/secret-store";
import { createAgeFileSecretReader, createAgeFileSecretStore, type AgeIdentityProvider } from "../src/age.js";

const identityProvider: AgeIdentityProvider = async () => ["provisioned-identity"];
const reader: Promise<SecretReader> = createAgeFileSecretReader({ rootPath: "/explicit/root", identityProvider });
const store: Promise<SecretStore> = createAgeFileSecretStore({ rootPath: "/explicit/root", identityProvider, recipients: ["public-recipient"] });
void reader;
void store;

// @ts-expect-error A reader has no replacement-write capability.
const writer: Promise<SecretStore> = createAgeFileSecretReader({ rootPath: "/explicit/root", identityProvider });
void writer;
// @ts-expect-error Roots are explicit; there is no default directory.
createAgeFileSecretReader({ identityProvider });
// @ts-expect-error A writer requires an explicit recipient policy.
createAgeFileSecretStore({ rootPath: "/explicit/root", identityProvider });
// @ts-expect-error There is no public filesystem injection boundary.
createAgeFileSecretReader({ rootPath: "/explicit/root", identityProvider, fileOperations: {} });
// @ts-expect-error Secret management and key generation are not part of this entry.
import { generateIdentity } from "../src/age.js";
void generateIdentity;
