import type { SecretStoreOptions } from "@vrtmrz/secret-store";

/** Supplies provisioned native X25519 identities once per existing-entry read. */
export type AgeIdentityProvider = () => Promise<readonly string[]>;

/** Explicit authority and key acquisition for an age file reader. */
export interface AgeFileSecretReaderOptions extends SecretStoreOptions {
  /**
   * Existing private directory owned by the effective user, beneath trusted
   * ancestors. Relative paths resolve once at construction. No directory is
   * created; symlinked path components are rejected.
   */
  rootPath: string;
  /**
   * Called once after a bounded entry read, never for absence or writes.
   * Return native X25519 identity strings; an empty list is unavailable.
   * Exceptions are sanitised. No key source is discovered or cached.
   */
  identityProvider: AgeIdentityProvider;
}

/** Adds an explicit future-encryption policy to an age file reader. */
export interface AgeFileSecretStoreOptions extends AgeFileSecretReaderOptions {
  /**
   * Non-empty native X25519 recipient list, validated and copied at construction.
   * Changing the caller's array does not change this store or existing files.
   */
  recipients: readonly string[];
}
