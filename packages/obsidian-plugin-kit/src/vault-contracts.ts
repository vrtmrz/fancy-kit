/**
 * A text-file operation boundary expressed with vault-relative paths.
 *
 * Operations settle only after the requested read or write has completed. Missing reads,
 * modifies, and appends reject with {@link VaultTextFileNotFoundError}; creating an existing
 * path rejects with {@link VaultTextFileExistsError}. Adapters may additionally propagate
 * platform I/O errors.
 */
export interface VaultTextAccess {
  /**
   * Reads an existing text file.
   * @param path - Vault-relative text-file path.
   */
  readText(path: string): Promise<string>;
  /**
   * Creates a new text file and fails when the path already exists.
   * @param path - Vault-relative path to create.
   * @param content - Complete initial text content.
   */
  createText(path: string, content: string): Promise<void>;
  /**
   * Replaces the contents of an existing text file.
   * @param path - Vault-relative path of an existing text file.
   * @param content - Complete replacement text content.
   */
  modifyText(path: string, content: string): Promise<void>;
  /**
   * Appends to an existing text file.
   * @param path - Vault-relative path of an existing text file.
   * @param content - Text appended without an implicit separator.
   */
  appendText(path: string, content: string): Promise<void>;
}

/** Error raised when a Vault text operation requires a file that does not exist. */
export class VaultTextFileNotFoundError extends Error {
  /** Normalised vault-relative path that could not be resolved to a text file. */
  readonly path: string;

  /** Creates a missing-text-file error. */
  constructor(path: string) {
    super(`Vault text file was not found: ${path}`);
    this.name = "VaultTextFileNotFoundError";
    this.path = path;
  }
}

/** Error raised when a Vault text create operation targets an existing path. */
export class VaultTextFileExistsError extends Error {
  /** Normalised vault-relative path that already exists. */
  readonly path: string;

  /** Creates an existing-path error. */
  constructor(path: string) {
    super(`Vault path already exists: ${path}`);
    this.name = "VaultTextFileExistsError";
    this.path = path;
  }
}
