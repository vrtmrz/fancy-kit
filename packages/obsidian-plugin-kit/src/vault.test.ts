import { beforeEach, describe, expect, it, vi } from "vitest";
import { TFile, type Vault } from "obsidian";
import {
  createObsidianVaultTextAccess,
  VaultTextFileExistsError,
  VaultTextFileNotFoundError,
} from "./vault.js";

vi.mock("obsidian", () => {
  class MockTFile {
    constructor(readonly path: string) {}
  }
  return {
    TFile: MockTFile,
    normalizePath: (path: string) =>
      path.replaceAll("\\", "/").replace(/\/{2,}/g, "/").replace(/^\.\//, ""),
  };
});

interface VaultFixture {
  readonly vault: Vault;
  readonly files: Map<string, TFile>;
  readonly contents: Map<TFile, string>;
}

function createVaultFixture(): VaultFixture {
  const files = new Map<string, TFile>();
  const contents = new Map<TFile, string>();
  const vault = {
    getAbstractFileByPath: (path: string) => files.get(path) ?? null,
    read: async (file: TFile) => contents.get(file) ?? "",
    create: async (path: string, content: string) => {
      const file = new TFile(path);
      files.set(path, file);
      contents.set(file, content);
      return file;
    },
    modify: async (file: TFile, content: string) => {
      contents.set(file, content);
    },
    append: async (file: TFile, content: string) => {
      contents.set(file, (contents.get(file) ?? "") + content);
    },
  } as unknown as Vault;
  return { vault, files, contents };
}

describe("createObsidianVaultTextAccess", () => {
  let fixture: VaultFixture;

  beforeEach(() => {
    fixture = createVaultFixture();
  });

  it("normalises paths and delegates text operations to one Vault", async () => {
    const existing = new TFile("Notes/existing.md");
    fixture.files.set(existing.path, existing);
    fixture.contents.set(existing, "first");
    const access = createObsidianVaultTextAccess(fixture.vault);

    await expect(access.readText("./Notes\\existing.md")).resolves.toBe("first");
    await access.appendText("Notes//existing.md", " second");
    await access.modifyText("Notes/existing.md", "replaced");
    await access.createText("Notes//new.md", "created");

    expect(fixture.contents.get(existing)).toBe("replaced");
    const created = fixture.files.get("Notes/new.md");
    expect(created).toBeInstanceOf(TFile);
    expect(created && fixture.contents.get(created)).toBe("created");
  });

  it("uses stable errors for missing text files and existing create paths", async () => {
    const existing = new TFile("existing.md");
    fixture.files.set(existing.path, existing);
    const access = createObsidianVaultTextAccess(fixture.vault);

    await expect(access.readText("missing.md")).rejects.toBeInstanceOf(
      VaultTextFileNotFoundError,
    );
    await expect(access.modifyText("missing.md", "text")).rejects.toBeInstanceOf(
      VaultTextFileNotFoundError,
    );
    await expect(access.createText("existing.md", "other")).rejects.toBeInstanceOf(
      VaultTextFileExistsError,
    );
  });
});
