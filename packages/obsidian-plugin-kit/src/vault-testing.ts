import {
  VaultTextFileExistsError,
  VaultTextFileNotFoundError,
  type VaultTextAccess,
} from "./vault-contracts.js";

export {
  VaultTextFileExistsError,
  VaultTextFileNotFoundError,
  type VaultTextAccess,
} from "./vault-contracts.js";

/** Recorded read operation. */
export interface VaultTextReadOperation {
  /** Operation discriminator. */
  readonly kind: "readText";
  /** Requested vault-relative path. */
  readonly path: string;
}

/** Recorded operation that supplies complete text content. */
export interface VaultTextCreateOperation {
  /** Operation discriminator. */
  readonly kind: "createText";
  /** Requested vault-relative path. */
  readonly path: string;
  /** Complete initial text content. */
  readonly content: string;
}

/** Recorded operation that replaces complete text content. */
export interface VaultTextModifyOperation {
  /** Operation discriminator. */
  readonly kind: "modifyText";
  /** Requested vault-relative path. */
  readonly path: string;
  /** Complete replacement text content. */
  readonly content: string;
}

/** Recorded operation that appends text without an implicit separator. */
export interface VaultTextAppendOperation {
  /** Operation discriminator. */
  readonly kind: "appendText";
  /** Requested vault-relative path. */
  readonly path: string;
  /** Appended text content. */
  readonly content: string;
}

/** Operation recorded by a Vault text test harness. */
export type VaultTextOperation =
  | VaultTextReadOperation
  | VaultTextCreateOperation
  | VaultTextModifyOperation
  | VaultTextAppendOperation;

/** Options for an instance-scoped Vault text test harness. */
export interface VaultTextTestHarnessOptions {
  /** Initial text files keyed by vault-relative path. */
  readonly files?: Readonly<Record<string, string>> | ReadonlyMap<string, string>;
  /**
   * Optional operation hook invoked after recording and before applying an operation.
   * Throw from the hook to inject a read or write failure without changing harness state.
   */
  readonly onOperation?: (operation: VaultTextOperation) => void | Promise<void>;
}

/** App-free Vault text capability, transcript, and observable in-memory state. */
export interface VaultTextTestHarness {
  /** Capability supplied to the application workflow under test. */
  readonly vault: VaultTextAccess;
  /** Operations recorded in call order. */
  readonly transcript: readonly VaultTextOperation[];
  /** Returns the current text at a path, or `undefined` when it does not exist. */
  getFile(path: string): string | undefined;
  /** Returns an isolated snapshot of all current files. */
  snapshot(): ReadonlyMap<string, string>;
}

function initialEntries(
  files: VaultTextTestHarnessOptions["files"],
): readonly (readonly [string, string])[] {
  if (files === undefined) return [];
  return files instanceof Map ? [...files.entries()] : Object.entries(files);
}

/** Creates an instance-scoped in-memory Vault text capability and spy transcript. */
export function createVaultTextTestHarness(
  options: VaultTextTestHarnessOptions = {},
): VaultTextTestHarness {
  const files = new Map<string, string>(initialEntries(options.files));
  const transcript: VaultTextOperation[] = [];

  async function observe(operation: VaultTextOperation): Promise<void> {
    transcript.push(operation);
    await options.onOperation?.(operation);
  }

  function requireFile(path: string): string {
    const content = files.get(path);
    if (content === undefined) throw new VaultTextFileNotFoundError(path);
    return content;
  }

  const vault: VaultTextAccess = {
    async readText(path) {
      const operation = { kind: "readText", path } as const;
      await observe(operation);
      return requireFile(path);
    },
    async createText(path, content) {
      const operation = { kind: "createText", path, content } as const;
      await observe(operation);
      if (files.has(path)) throw new VaultTextFileExistsError(path);
      files.set(path, content);
    },
    async modifyText(path, content) {
      const operation = { kind: "modifyText", path, content } as const;
      await observe(operation);
      requireFile(path);
      files.set(path, content);
    },
    async appendText(path, content) {
      const operation = { kind: "appendText", path, content } as const;
      await observe(operation);
      files.set(path, requireFile(path) + content);
    },
  };

  return {
    vault,
    transcript,
    getFile: (path) => files.get(path),
    snapshot: () => new Map(files),
  };
}
