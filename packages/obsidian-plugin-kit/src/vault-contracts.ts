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

/** Mutable YAML frontmatter object supplied to a synchronous updater. */
export type VaultFrontmatter = Record<string, unknown>;

/** Synchronous in-place frontmatter mutation. */
export type VaultFrontmatterUpdater = (frontmatter: VaultFrontmatter) => void;

/** Path-based capability for updating an existing Markdown file's frontmatter. */
export interface VaultFrontmatterAccess {
  /**
   * Updates frontmatter through one synchronous mutation callback.
   * @param path - Vault-relative path of an existing Markdown file.
   * @param updater - Synchronous callback that mutates the supplied object in place.
   */
  updateFrontmatter(path: string, updater: VaultFrontmatterUpdater): Promise<void>;
}

/** Error raised when a frontmatter update path does not resolve to a file. */
export class VaultFrontmatterFileNotFoundError extends Error {
  /** Normalised vault-relative path that did not resolve to a file. */
  readonly path: string;

  /** Creates a missing-frontmatter-file error. */
  constructor(path: string) {
    super(`Vault frontmatter file was not found: ${path}`);
    this.name = "VaultFrontmatterFileNotFoundError";
    this.path = path;
  }
}

/** Error raised when frontmatter is requested for a non-Markdown file. */
export class VaultFrontmatterUnsupportedFileError extends Error {
  /** Normalised vault-relative path of the unsupported file. */
  readonly path: string;

  /** Creates an unsupported-frontmatter-file error. */
  constructor(path: string) {
    super(`Vault frontmatter requires a Markdown file: ${path}`);
    this.name = "VaultFrontmatterUnsupportedFileError";
    this.path = path;
  }
}

/** Error raised when an updater returns a promise or another thenable. */
export class VaultFrontmatterAsyncUpdaterError extends Error {
  /** Vault-relative path whose updater was asynchronous. */
  readonly path: string;

  /** Creates an asynchronous-updater error. */
  constructor(path: string) {
    super(`Vault frontmatter updater must be synchronous: ${path}`);
    this.name = "VaultFrontmatterAsyncUpdaterError";
    this.path = path;
  }
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" && value !== null) || typeof value === "function"
  ) && "then" in value && typeof value.then === "function";
}

/** @internal Invokes an updater and rejects accidentally asynchronous callbacks. */
export function invokeVaultFrontmatterUpdater(
  path: string,
  updater: VaultFrontmatterUpdater,
  frontmatter: VaultFrontmatter,
): void {
  const result = updater(frontmatter);
  if (!isThenable(result)) return;

  // Observe a later rejection so reporting the contract error does not also
  // create an unhandled rejection. Obsidian must not serialise this update.
  void Promise.resolve(result).catch(() => undefined);
  throw new VaultFrontmatterAsyncUpdaterError(path);
}
