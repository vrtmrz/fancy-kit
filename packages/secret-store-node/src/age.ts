import type { SecretReader, SecretStore } from "@vrtmrz/secret-store";
import type { AgeFileSecretReaderOptions, AgeFileSecretStoreOptions } from "./age-types.js";
import { createAgeReaderWithOperations, createAgeStoreWithOperations } from "./internal/age-files.js";
import { nodeFileOperations } from "./internal/file-operations.js";

export type { AgeIdentityProvider, AgeFileSecretReaderOptions, AgeFileSecretStoreOptions } from "./age-types.js";

/**
 * Binds an existing private age directory to the read-only secret contract.
 *
 * Construction validates the root and its ancestors without creating paths or
 * acquiring identities. POSIX ownership and no-follow opens are required;
 * Windows returns `unavailable`. A missing entry returns null only while the
 * original root remains available. Names use the neutral 1–64-character profile.
 * Read at most 1 MiB of ciphertext; return fully authenticated, strict UTF-8 values
 * up to 64 KiB, preserving empty strings, NUL, whitespace, and a leading BOM.
 * The provider runs once after reading an existing file and is never cached.
 *
 * @param options - An explicit existing root and identity provider.
 * @returns A reader with no write, delete, list, or provisioning capability.
 * @throws SecretStoreError through rejection, with fixed messages and no causes.
 */
export function createAgeFileSecretReader(options: AgeFileSecretReaderOptions): Promise<SecretReader> {
  return createAgeReaderWithOperations(options, nodeFileOperations);
}

/**
 * Binds an existing private age directory to reads and atomic replacement writes.
 *
 * Writes use copied explicit recipients and never acquire identities. They
 * encrypt in memory, create an exclusive 0600 ciphertext temporary file, flush
 * and close it, rename within the root, and sync the directory. Concurrent
 * writers use last-writer-wins replacement; no lock, retry, backup, or transaction
 * is added. A rejected write after replacement starts has an uncertain outcome.
 * Only the operation's verified temporary inode is eligible for cleanup.
 *
 * Use a qualified local filesystem and trusted root/ancestor owners. Portable
 * Node checks do not defeat hostile owners racing path replacement or establish
 * Windows ACL, network-filesystem, or hardware power-loss guarantees. More
 * permissive paths are rejected rather than repaired. The factory creates no
 * directory, recipient file, or identity, and never reads environment variables.
 *
 * @param options - Existing root, identity provider, and native X25519 recipients.
 * @returns A store with the reader's exact-value and finite-size contracts.
 * @throws SecretStoreError through rejection; failures never reveal values,
 * identities, caller-supplied paths, or upstream messages, and never select a fallback store.
 */
export function createAgeFileSecretStore(options: AgeFileSecretStoreOptions): Promise<SecretStore> {
  return createAgeStoreWithOperations(options, nodeFileOperations);
}
