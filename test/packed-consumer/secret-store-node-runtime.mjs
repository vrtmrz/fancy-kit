import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateIdentity, identityToRecipient } from "age-encryption";
import { SecretStoreError } from "@vrtmrz/secret-store";
import { createAgeFileSecretReader, createAgeFileSecretStore } from "@vrtmrz/secret-store-node/age";

const rootPath = await mkdtemp(join(tmpdir(), "fancy-kit-packed-age-"));
try {
  const identity = await generateIdentity();
  const recipients = [await identityToRecipient(identity)];
  let acquisitions = 0;
  const identityProvider = async () => { acquisitions += 1; return [identity]; };
  const store = await createAgeFileSecretStore({ rootPath, recipients, identityProvider });
  assert.equal(await store.getValue("missing"), null);
  assert.equal(await store.getValue("missing", ""), "");
  assert.deepEqual(await store.getObject("missing", { enabled: false }), { enabled: false });
  assert.equal(await store.getValue("missing"), null);
  await store.setValue("empty", "");
  assert.equal(acquisitions, 0);
  const value = "\ufeffsynthetic\0value\n";
  await store.setValue("token", value);
  const reader = await createAgeFileSecretReader({ rootPath, identityProvider });
  assert.equal(await reader.getValue("empty", "fallback"), "");
  assert.equal(await reader.getValue("token"), value);
  assert.equal(acquisitions, 2);
  assert.equal("setValue" in reader, false);
  assert.equal((await readFile(join(rootPath, "secret-token.age"))).subarray(0, 22).toString(), "age-encryption.org/v1\n");
  for (const name of ["INVALID", "a".repeat(65)]) {
    await assert.rejects(reader.getValue(name), error => error instanceof SecretStoreError && error.code === "invalid-name");
  }
  await assert.rejects(import("@vrtmrz/secret-store-node/internal/age-codec"), { code: "ERR_PACKAGE_PATH_NOT_EXPORTED" });
  await assert.rejects(import("@vrtmrz/secret-store-node"), { code: "ERR_PACKAGE_PATH_NOT_EXPORTED" });
} finally {
  await rm(rootPath, { recursive: true, force: true });
}
