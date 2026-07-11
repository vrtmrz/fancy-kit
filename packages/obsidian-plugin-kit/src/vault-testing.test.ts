import { describe, expect, it } from "vitest";
import {
  VaultTextFileExistsError,
  VaultTextFileNotFoundError,
} from "./vault-contracts.js";
import { createVaultTextTestHarness } from "./vault-testing.js";

describe("createVaultTextTestHarness", () => {
  it("records text operations and exposes the final file state", async () => {
    const harness = createVaultTextTestHarness({
      files: { "Notes/existing.md": "first" },
    });

    await expect(harness.vault.readText("Notes/existing.md")).resolves.toBe("first");
    await harness.vault.appendText("Notes/existing.md", " second");
    await harness.vault.modifyText("Notes/existing.md", "replaced");
    await harness.vault.createText("Notes/new.md", "created");

    expect(harness.transcript).toEqual([
      { kind: "readText", path: "Notes/existing.md" },
      { kind: "appendText", path: "Notes/existing.md", content: " second" },
      { kind: "modifyText", path: "Notes/existing.md", content: "replaced" },
      { kind: "createText", path: "Notes/new.md", content: "created" },
    ]);
    expect([...harness.snapshot()]).toEqual([
      ["Notes/existing.md", "replaced"],
      ["Notes/new.md", "created"],
    ]);
  });

  it("uses stable errors for missing and existing paths", async () => {
    const harness = createVaultTextTestHarness({ files: { "existing.md": "text" } });

    await expect(harness.vault.readText("missing.md")).rejects.toBeInstanceOf(
      VaultTextFileNotFoundError,
    );
    await expect(harness.vault.modifyText("missing.md", "text")).rejects.toBeInstanceOf(
      VaultTextFileNotFoundError,
    );
    await expect(harness.vault.createText("existing.md", "other")).rejects.toBeInstanceOf(
      VaultTextFileExistsError,
    );
  });

  it("can inject a failure after recording without mutating file state", async () => {
    const failure = new Error("write failed");
    const harness = createVaultTextTestHarness({
      files: { "note.md": "before" },
      onOperation: (operation) => {
        if (operation.kind === "modifyText") throw failure;
      },
    });

    await expect(harness.vault.modifyText("note.md", "after")).rejects.toBe(failure);
    expect(harness.getFile("note.md")).toBe("before");
    expect(harness.transcript).toEqual([
      { kind: "modifyText", path: "note.md", content: "after" },
    ]);
  });
});
