import { describe, expect, it } from "vitest";
import {
  VaultFrontmatterAsyncUpdaterError,
  VaultFrontmatterFileNotFoundError,
  VaultFrontmatterUnsupportedFileError,
  type VaultFrontmatter,
  type VaultFrontmatterUpdater,
} from "./vault-contracts.js";
import { createVaultFrontmatterTestHarness } from "./vault-testing.js";

describe("createVaultFrontmatterTestHarness", () => {
  it("records isolated before and after snapshots and commits the update", async () => {
    const initial = { tags: ["before"], nested: { count: 1 }, removed: true };
    const harness = createVaultFrontmatterTestHarness({ files: { "note.md": initial } });

    await harness.vault.updateFrontmatter("note.md", (frontmatter) => {
      (frontmatter.tags as string[]).push("after");
      (frontmatter.nested as { count: number }).count += 1;
      delete frontmatter.removed;
    });

    expect(harness.transcript).toEqual([
      {
        kind: "updateFrontmatter",
        path: "note.md",
        before: { tags: ["before"], nested: { count: 1 }, removed: true },
        after: { tags: ["before", "after"], nested: { count: 2 } },
      },
    ]);
    expect(harness.getFrontmatter("note.md")).toEqual({
      tags: ["before", "after"],
      nested: { count: 2 },
    });
    expect(initial).toEqual({ tags: ["before"], nested: { count: 1 }, removed: true });
  });

  it("rolls back nested mutations when the updater throws", async () => {
    const harness = createVaultFrontmatterTestHarness({
      files: { "note.md": { nested: { value: "before" } } },
    });
    const failure = new Error("update failed");

    await expect(harness.vault.updateFrontmatter("note.md", (frontmatter) => {
      (frontmatter.nested as { value: string }).value = "after";
      throw failure;
    })).rejects.toBe(failure);
    expect(harness.getFrontmatter("note.md")).toEqual({ nested: { value: "before" } });
    expect(harness.transcript[0]).toEqual({
      kind: "updateFrontmatter",
      path: "note.md",
      before: { nested: { value: "before" } },
      after: null,
    });
  });

  it("records and propagates an injected failure before mutation", async () => {
    const failure = new Error("injected failure");
    const harness = createVaultFrontmatterTestHarness({
      files: { "note.md": { value: "before" } },
      onOperation: () => {
        throw failure;
      },
    });

    await expect(harness.vault.updateFrontmatter("note.md", (frontmatter) => {
      frontmatter.value = "after";
    })).rejects.toBe(failure);
    expect(harness.getFrontmatter("note.md")).toEqual({ value: "before" });
    expect(harness.transcript[0]?.after).toBeNull();
  });

  it("uses stable errors for missing and non-Markdown paths", async () => {
    const harness = createVaultFrontmatterTestHarness({
      files: { "image.png": { value: "before" } },
    });

    await expect(harness.vault.updateFrontmatter("missing.md", () => {})).rejects.toBeInstanceOf(
      VaultFrontmatterFileNotFoundError,
    );
    await expect(harness.vault.updateFrontmatter("image.png", () => {})).rejects.toBeInstanceOf(
      VaultFrontmatterUnsupportedFileError,
    );
    expect(harness.transcript).toHaveLength(2);
    expect(harness.transcript.every((operation) => operation.after === null)).toBe(true);
  });

  it("rejects an async updater without committing its working copy", async () => {
    const harness = createVaultFrontmatterTestHarness({
      files: { "note.md": { value: "before" } },
    });
    const asyncUpdater = (async (frontmatter: VaultFrontmatter) => {
      frontmatter.value = "after";
    }) as unknown as VaultFrontmatterUpdater;

    await expect(harness.vault.updateFrontmatter("note.md", asyncUpdater)).rejects.toBeInstanceOf(
      VaultFrontmatterAsyncUpdaterError,
    );
    expect(harness.getFrontmatter("note.md")).toEqual({ value: "before" });
    expect(harness.transcript[0]?.after).toBeNull();
  });

  it("does not expose mutable harness state through snapshots", async () => {
    const harness = createVaultFrontmatterTestHarness({
      files: { "note.md": { nested: { value: "before" } } },
    });
    const snapshot = harness.getFrontmatter("note.md");
    expect(snapshot).toBeDefined();

    expect(() => {
      (snapshot?.nested as { value: string }).value = "outside";
    }).toThrow();
    expect(harness.getFrontmatter("note.md")).toEqual({ nested: { value: "before" } });
  });
});
