import { normalizePath, TFile, type TAbstractFile, type Vault } from "obsidian";
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
