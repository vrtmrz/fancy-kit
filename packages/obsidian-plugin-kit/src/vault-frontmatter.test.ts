import { describe, expect, it, vi } from "vitest";
import { TFile, type App } from "obsidian";
import {
  createObsidianVaultFrontmatterAccess,
  VaultFrontmatterAsyncUpdaterError,
  VaultFrontmatterFileNotFoundError,
  VaultFrontmatterUnsupportedFileError,
  type VaultFrontmatter,
  type VaultFrontmatterUpdater,
} from "./vault.js";

vi.mock("obsidian", () => {
  class MockTFile {
    readonly extension: string;

    constructor(readonly path: string) {
      this.extension = path.includes(".") ? path.split(".").at(-1) ?? "" : "";
    }
  }
  return {
    TFile: MockTFile,
    normalizePath: (path: string) =>
      path.replaceAll("\\", "/").replace(/\/{2,}/g, "/").replace(/^\.\//, ""),
  };
});

interface FrontmatterFixture {
  readonly app: App;
  readonly files: Map<string, TFile | object>;
  readonly frontmatters: Map<TFile, VaultFrontmatter>;
  readonly processed: TFile[];
}

function createFrontmatterFixture(): FrontmatterFixture {
  const files = new Map<string, TFile | object>();
  const frontmatters = new Map<TFile, VaultFrontmatter>();
  const processed: TFile[] = [];
  const app = {
    vault: {
      getAbstractFileByPath: (path: string) => files.get(path) ?? null,
    },
    fileManager: {
      async processFrontMatter(
        file: TFile,
        updater: (frontmatter: VaultFrontmatter) => void,
      ) {
        processed.push(file);
        const current = frontmatters.get(file) ?? {};
        const updated = structuredClone(current);
        updater(updated);
        frontmatters.set(file, updated);
      },
    },
  } as unknown as App;
  return { app, files, frontmatters, processed };
}

describe("createObsidianVaultFrontmatterAccess", () => {
  it("normalises a Markdown path and delegates one synchronous update", async () => {
    const fixture = createFrontmatterFixture();
    const file = new TFile("Notes/example.md");
    fixture.files.set(file.path, file);
    fixture.frontmatters.set(file, { tags: ["before"], nested: { count: 1 } });
    const access = createObsidianVaultFrontmatterAccess(fixture.app);

    await access.updateFrontmatter("./Notes\\example.md", (frontmatter) => {
      frontmatter.tags = ["after"];
      frontmatter.created = true;
    });

    expect(fixture.processed).toEqual([file]);
    expect(fixture.frontmatters.get(file)).toEqual({
      tags: ["after"],
      nested: { count: 1 },
      created: true,
    });
  });

  it("uses stable errors for missing, non-file, and non-Markdown paths", async () => {
    const fixture = createFrontmatterFixture();
    fixture.files.set("Folder", {});
    fixture.files.set("image.png", new TFile("image.png"));
    const access = createObsidianVaultFrontmatterAccess(fixture.app);

    const missing = access.updateFrontmatter("./missing.md", () => {});
    await expect(missing).rejects.toBeInstanceOf(VaultFrontmatterFileNotFoundError);
    await expect(missing).rejects.toMatchObject({ path: "missing.md" });
    await expect(access.updateFrontmatter("Folder", () => {})).rejects.toBeInstanceOf(
      VaultFrontmatterFileNotFoundError,
    );
    await expect(access.updateFrontmatter("image.png", () => {})).rejects.toBeInstanceOf(
      VaultFrontmatterUnsupportedFileError,
    );
    expect(fixture.processed).toEqual([]);
  });

  it("propagates callback failures without committing a mutation", async () => {
    const fixture = createFrontmatterFixture();
    const file = new TFile("note.md");
    fixture.files.set(file.path, file);
    fixture.frontmatters.set(file, { nested: { value: "before" } });
    const access = createObsidianVaultFrontmatterAccess(fixture.app);
    const failure = new Error("callback failed");

    await expect(access.updateFrontmatter(file.path, (frontmatter) => {
      (frontmatter.nested as { value: string }).value = "after";
      throw failure;
    })).rejects.toBe(failure);
    expect(fixture.frontmatters.get(file)).toEqual({ nested: { value: "before" } });
  });

  it("propagates FileManager failures unchanged", async () => {
    const fixture = createFrontmatterFixture();
    const file = new TFile("note.md");
    fixture.files.set(file.path, file);
    const access = createObsidianVaultFrontmatterAccess(fixture.app);
    const failure = new Error("frontmatter serialisation failed");
    vi.spyOn(fixture.app.fileManager, "processFrontMatter").mockRejectedValue(failure);

    await expect(access.updateFrontmatter(file.path, () => {})).rejects.toBe(failure);
  });

  it("rejects an accidentally asynchronous updater", async () => {
    const fixture = createFrontmatterFixture();
    const file = new TFile("note.md");
    fixture.files.set(file.path, file);
    fixture.frontmatters.set(file, { value: "before" });
    const access = createObsidianVaultFrontmatterAccess(fixture.app);
    const asyncUpdater = (async (frontmatter: VaultFrontmatter) => {
      frontmatter.value = "after";
    }) as unknown as VaultFrontmatterUpdater;

    await expect(access.updateFrontmatter(file.path, asyncUpdater)).rejects.toBeInstanceOf(
      VaultFrontmatterAsyncUpdaterError,
    );
    expect(fixture.frontmatters.get(file)).toEqual({ value: "before" });
  });
});
