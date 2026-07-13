import { normalizePath, TFile, type App, type TAbstractFile, type Vault } from "obsidian";
import {
  invokeVaultFrontmatterUpdater,
  VaultFrontmatterFileNotFoundError,
  VaultFrontmatterUnsupportedFileError,
  VaultTextFileExistsError,
  VaultTextFileNotFoundError,
  type VaultFrontmatterAccess,
  type VaultFrontmatterUpdater,
  type VaultTextAccess,
} from "./vault-contracts.js";

export {
  VaultFrontmatterAsyncUpdaterError,
  VaultFrontmatterFileNotFoundError,
  VaultFrontmatterUnsupportedFileError,
  VaultTextFileExistsError,
  VaultTextFileNotFoundError,
  type VaultFrontmatter,
  type VaultFrontmatterAccess,
  type VaultFrontmatterUpdater,
  type VaultTextAccess,
} from "./vault-contracts.js";

function requireTextFile(vault: Vault, path: string): TFile {
  const file = vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) throw new VaultTextFileNotFoundError(path);
  return file;
}

/** Obsidian-backed implementation of the path-based text Vault capability. */
export class ObsidianVaultTextAccess implements VaultTextAccess {
  readonly #vault: Vault;

  /** Creates an adapter owned by the supplied Vault instance. */
  constructor(vault: Vault) {
    this.#vault = vault;
  }

  async readText(path: string): Promise<string> {
    const normalisedPath = normalizePath(path);
    return await this.#vault.read(requireTextFile(this.#vault, normalisedPath));
  }

  async createText(path: string, content: string): Promise<void> {
    const normalisedPath = normalizePath(path);
    const existing = this.#vault.getAbstractFileByPath(normalisedPath) as TAbstractFile | null;
    if (existing !== null) throw new VaultTextFileExistsError(normalisedPath);
    await this.#vault.create(normalisedPath, content);
  }

  async modifyText(path: string, content: string): Promise<void> {
    const normalisedPath = normalizePath(path);
    await this.#vault.modify(requireTextFile(this.#vault, normalisedPath), content);
  }

  async appendText(path: string, content: string): Promise<void> {
    const normalisedPath = normalizePath(path);
    await this.#vault.append(requireTextFile(this.#vault, normalisedPath), content);
  }
}

/** Creates an Obsidian adapter for path-based text Vault operations. */
export function createObsidianVaultTextAccess(vault: Vault): VaultTextAccess {
  return new ObsidianVaultTextAccess(vault);
}

/** Obsidian services required by the frontmatter adapter factory. */
export type ObsidianVaultFrontmatterHost = Pick<App, "vault" | "fileManager">;

/** Obsidian-backed implementation of the path-based frontmatter capability. */
export class ObsidianVaultFrontmatterAccess implements VaultFrontmatterAccess {
  readonly #host: ObsidianVaultFrontmatterHost;

  /** Creates an adapter owned by the supplied Vault and FileManager services. */
  constructor(host: ObsidianVaultFrontmatterHost) {
    this.#host = host;
  }

  async updateFrontmatter(path: string, updater: VaultFrontmatterUpdater): Promise<void> {
    const normalisedPath = normalizePath(path);
    const file = this.#host.vault.getAbstractFileByPath(normalisedPath);
    if (!(file instanceof TFile)) {
      throw new VaultFrontmatterFileNotFoundError(normalisedPath);
    }
    if (file.extension.toLowerCase() !== "md") {
      throw new VaultFrontmatterUnsupportedFileError(normalisedPath);
    }

    await this.#host.fileManager.processFrontMatter(file, (frontmatter: unknown) => {
      invokeVaultFrontmatterUpdater(
        normalisedPath,
        updater,
        frontmatter as Record<string, unknown>,
      );
    });
  }
}

/** Creates an Obsidian adapter for path-based frontmatter updates. */
export function createObsidianVaultFrontmatterAccess(
  host: ObsidianVaultFrontmatterHost,
): VaultFrontmatterAccess {
  return new ObsidianVaultFrontmatterAccess(host);
}
