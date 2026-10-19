import type { SecretReader, SecretStore } from "@vrtmrz/secret-store";
import {
  createAgeFileSecretReader,
  createAgeFileSecretStore,
  type AgeIdentityProvider,
  type AgeFileSecretReaderOptions,
  type AgeFileSecretStoreOptions,
} from "@vrtmrz/secret-store-node/age";

const identityProvider: AgeIdentityProvider = async () => [];
const readerOptions: AgeFileSecretReaderOptions = { rootPath: "explicit-root", identityProvider };
const options: AgeFileSecretStoreOptions = { ...readerOptions, recipients: ["explicit-recipient"] };
const reader: SecretReader = await createAgeFileSecretReader(readerOptions);
const store: SecretStore = await createAgeFileSecretStore(options);
const result: string | null = await reader.getValue("token");
await store.setValue("token", "");
void result;
// @ts-expect-error A reader provides no writer capability.
await reader.setValue("token", "value");
// @ts-expect-error Future encryption recipients are explicit.
await createAgeFileSecretStore(readerOptions);
// @ts-expect-error Node file operations are not a public injection surface.
await createAgeFileSecretReader(readerOptions, {});
// @ts-expect-error Internal codec modules are not exported.
await import("@vrtmrz/secret-store-node/internal/age-codec");
// @ts-expect-error There is no automatic backend selection through a root entry.
await import("@vrtmrz/secret-store-node");
