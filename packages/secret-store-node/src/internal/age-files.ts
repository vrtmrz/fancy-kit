import { ValueStoreError } from "@vrtmrz/value-store";
import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { validateSecretName, createSecretReader, createSecretStore, type SecretBackendReader, type SecretReader, type SecretStore } from "@vrtmrz/secret-store";
import type { AgeFileSecretReaderOptions, AgeFileSecretStoreOptions, AgeIdentityProvider } from "../age-types.js";
import { createAgeEncryptor, decryptAgeValue, encodeAgeValue, MAX_CIPHERTEXT_BYTES } from "./age-codec.js";
import { createRootAuthority, fileErrorCode, sameFile, sanitiseFileError, validateSecretFile, type FileIdentity, type RootAuthority } from "./file-authority.js";
import type { SecretFileOperations } from "./file-operations.js";

function entryPath(root: RootAuthority, name: string): string {
  return join(root.path, `secret-${name}.age`);
}

async function inspectEntry(path: string, userId: bigint, operations: SecretFileOperations): Promise<boolean> {
  let stat;
  try {
    stat = await operations.statPath(path);
  } catch (error) {
    if (fileErrorCode(error) === "ENOENT") return false;
    throw error;
  }
  validateSecretFile(stat, userId);
  return true;
}

async function readCiphertext(root: RootAuthority, name: string, operations: SecretFileOperations): Promise<Uint8Array | null> {
  const userId = await root.validate();
  const path = entryPath(root, name);
  if (!await inspectEntry(path, userId, operations)) {
    await root.validate();
    return null;
  }
  let handle;
  try {
    handle = await operations.openFile(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (error) {
    if (fileErrorCode(error) !== "ENOENT") throw error;
    await root.validate();
    return null;
  }
  let ciphertext: Uint8Array;
  try {
    const stat = await handle.stat();
    // An atomic replacement can unlink an already opened old inode. It remains
    // a valid complete read; a hard link to another pathname does not.
    validateSecretFile(stat, userId, true);
    if (stat.size < 0n || stat.size > BigInt(MAX_CIPHERTEXT_BYTES)) throw new ValueStoreError("invalid-data");
    const expectedSize = Number(stat.size);
    const buffer = new Uint8Array(expectedSize + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const count = await handle.read(buffer, offset, buffer.length - offset, offset);
      if (count === 0) break;
      offset += count;
    }
    if (offset !== expectedSize) throw new ValueStoreError("invalid-data");
    const after = await handle.stat();
    validateSecretFile(after, userId, true);
    if (after.size !== stat.size) throw new ValueStoreError("invalid-data");
    ciphertext = buffer.subarray(0, offset);
  } finally {
    await handle.close();
  }
  await root.validate();
  return ciphertext;
}

function reader(root: RootAuthority, identityProvider: AgeIdentityProvider, operations: SecretFileOperations): SecretBackendReader {
  return {
    async get(name) {
      try {
        validateSecretName(name);
        const ciphertext = await readCiphertext(root, name, operations);
        return ciphertext === null ? null : await decryptAgeValue(ciphertext, identityProvider);
      } catch (error) {
        throw sanitiseFileError(error);
      }
    },
  };
}

async function removeOwnedTemporary(
  root: RootAuthority,
  path: string,
  identity: FileIdentity,
  operations: SecretFileOperations,
): Promise<void> {
  await root.validate(true);
  let stat;
  try {
    stat = await operations.statPath(path);
  } catch (error) {
    if (fileErrorCode(error) === "ENOENT") return;
    throw error;
  }
  if (!sameFile(stat, identity) || !stat.isFile() || stat.nlink !== 1n) {
    throw new ValueStoreError("operation-failed");
  }
  await operations.unlink(path);
}

async function replaceCiphertext(
  root: RootAuthority,
  name: string,
  ciphertext: Uint8Array,
  operations: SecretFileOperations,
): Promise<void> {
  let replacementStarted = false;
  try {
    const userId = await root.validate(true);
    const destination = entryPath(root, name);
    await inspectEntry(destination, userId, operations);
    const directory = await operations.openFile(root.path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    try {
      if (!sameFile(await directory.stat(), root.identity)) throw new ValueStoreError("unavailable");
      let temporaryPath: string | undefined;
      let temporaryIdentity: FileIdentity | undefined;
      try {
        await root.validate(true);
        const candidate = join(root.path, `.secret-store-${randomUUID()}.tmp`);
        const temporary = await operations.openFile(
          candidate,
          constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
          0o600,
        );
        temporaryPath = candidate;
        try {
          const stat = await temporary.stat();
          temporaryIdentity = stat;
          validateSecretFile(stat, userId);
          if ((stat.mode & 0o600n) !== 0o600n) throw new ValueStoreError("access-denied");
          await temporary.writeFile(ciphertext);
          await temporary.sync();
        } finally {
          await temporary.close();
        }
        await root.validate(true);
        await inspectEntry(destination, userId, operations);
        const currentTemporary = await operations.statPath(candidate);
        validateSecretFile(currentTemporary, userId);
        if (!sameFile(currentTemporary, temporaryIdentity)) throw new ValueStoreError("operation-failed");
        replacementStarted = true;
        await operations.rename(candidate, destination);
        temporaryPath = undefined;
        await directory.sync();
        await root.validate(true);
      } finally {
        // If descriptor inspection itself failed, ownership cannot be proved;
        // leave that private artefact for explicit operator inspection.
        if (temporaryPath !== undefined && temporaryIdentity !== undefined) {
          await removeOwnedTemporary(root, temporaryPath, temporaryIdentity, operations);
        }
      }
    } finally {
      await directory.close();
    }
  } catch (error) {
    // Once replacement is attempted, the caller must not infer rollback from
    // any error, including a late sync/close failure or an uncertain rename.
    throw replacementStarted ? new ValueStoreError("operation-failed") : sanitiseFileError(error);
  }
}

function validateReaderOptions(options: AgeFileSecretReaderOptions): void {
  if (!options || typeof options.identityProvider !== "function") throw new ValueStoreError("invalid-value");
}

/** Private injected constructor; the public reader always uses real Node I/O. */
export async function createAgeReaderWithOperations(
  options: AgeFileSecretReaderOptions,
  operations: SecretFileOperations,
): Promise<SecretReader> {
  try {
    validateReaderOptions(options);
    const identityProvider = options.identityProvider;
    let root: RootAuthority;
    const facade = createSecretReader({
      get: (name) => reader(root, identityProvider, operations).get(name),
    }, options);
    root = await createRootAuthority(options.rootPath, false, operations);
    return facade;
  } catch (error) {
    throw sanitiseFileError(error);
  }
}

/** Private injected constructor; no injected operation is exported by the package. */
export async function createAgeStoreWithOperations(
  options: AgeFileSecretStoreOptions,
  operations: SecretFileOperations,
): Promise<SecretStore> {
  try {
    validateReaderOptions(options);
    const identityProvider = options.identityProvider;
    const encrypt = createAgeEncryptor(options.recipients);
    let root: RootAuthority;
    const facade = createSecretStore({
      get: (name) => reader(root, identityProvider, operations).get(name),
      async set(name, value) {
        try {
          validateSecretName(name);
          const plaintext = encodeAgeValue(value);
          await root.validate(true);
          const ciphertext = await encrypt(plaintext);
          await replaceCiphertext(root, name, ciphertext, operations);
        } catch (error) {
          throw sanitiseFileError(error);
        }
      },
    }, options);
    root = await createRootAuthority(options.rootPath, true, operations);
    return facade;
  } catch (error) {
    throw sanitiseFileError(error);
  }
}
