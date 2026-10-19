/** Compile the focused adapter without Node, DOM, or Obsidian runtime types. */
import { createObsidianSecretStore } from "@vrtmrz/obsidian-plugin-kit/secrets";
import type { ObsidianSecretStorage } from "@vrtmrz/obsidian-plugin-kit/secrets";
import type { SecretReader, SecretStore } from "@vrtmrz/secret-store";

const host: ObsidianSecretStorage = {
  getSecret: () => null,
  setSecret: () => {},
};
const store: SecretStore = createObsidianSecretStore(host);
const reader: SecretReader = store;
const result: Promise<string | null> = reader.getValue("example-token");
void result;

// @ts-expect-error Both synchronous host methods are required.
createObsidianSecretStore({ getSecret: () => null });
// @ts-expect-error Asynchronous host reads are not Obsidian SecretStorage.
createObsidianSecretStore({ getSecret: async () => null, setSecret() {} });
// @ts-expect-error The adapter does not add enumeration.
store.list();
// @ts-expect-error The adapter does not emulate deletion.
store.delete("example-token");
