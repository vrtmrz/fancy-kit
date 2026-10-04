import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { createTemporaryVault } from "./vault.js";

describe("createTemporaryVault", () => {
  function isBelow(parentPath: string, childPath: string): boolean {
    const pathFromParent = relative(parentPath, childPath);
    return (
      pathFromParent.length > 0 &&
      pathFromParent !== ".." &&
      !pathFromParent.startsWith(`..${sep}`)
    );
  }

  it("creates isolated profile state and removes it on disposal", async () => {
    const previousKeep = process.env.E2E_OBSIDIAN_KEEP_VAULT;
    delete process.env.E2E_OBSIDIAN_KEEP_VAULT;
    const vault = await createTemporaryVault({
      prefix: "obsidian-runner-unit-",
      pluginIds: ["example-plugin"],
      idPrefix: "runner-unit",
    });
    try {
      expect(
        JSON.parse(
          await readFile(
            join(vault.path, ".obsidian", "community-plugins.json"),
            "utf8",
          ),
        ),
      ).toEqual(["example-plugin"]);
      expect(vault.id).toMatch(/^runner-unit-/u);
      expect(vault.processMarker).toBe(vault.statePath);
      expect(existsSync(join(vault.userDataPath, "obsidian.json"))).toBe(true);
      expect(
        existsSync(
          join(
            vault.homePath,
            "Library",
            "Application Support",
            "obsidian",
            "obsidian.json",
          ),
        ),
      ).toBe(true);
    } finally {
      await vault.dispose();
      if (previousKeep === undefined)
        delete process.env.E2E_OBSIDIAN_KEEP_VAULT;
      else process.env.E2E_OBSIDIAN_KEEP_VAULT = previousKeep;
    }
    expect(existsSync(vault.path)).toBe(false);
    expect(existsSync(vault.statePath)).toBe(false);
  });

  it("creates both isolated roots below an explicitly selected temporary root", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "obsidian-root-unit-"));
    const options = {
      prefix: "obsidian-selected-root-",
      temporaryRoot,
    };
    const vault = await createTemporaryVault(options);
    try {
      expect(isBelow(temporaryRoot, vault.path)).toBe(true);
      expect(isBelow(temporaryRoot, vault.statePath)).toBe(true);
    } finally {
      await vault.dispose();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
