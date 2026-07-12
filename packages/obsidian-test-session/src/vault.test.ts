import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTemporaryVault } from "./vault.js";

describe("createTemporaryVault", () => {
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
      expect(vault.processMarker).toBe("obsidian-runner-unit-state-");
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
});
