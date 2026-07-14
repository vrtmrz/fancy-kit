import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { installBuiltPlugin } from "./plugin-installer.js";

describe("installBuiltPlugin", () => {
  it("copies required and optional artefacts and registers the plug-in", async () => {
    const root = await mkdtemp(join(tmpdir(), "obsidian-runner-install-"));
    const vaultPath = join(root, "vault");
    const artifactRoot = join(root, "artefacts");
    await mkdir(join(vaultPath, ".obsidian"), { recursive: true });
    await mkdir(artifactRoot, { recursive: true });
    await Promise.all([
      writeFile(join(artifactRoot, "main.js"), "export {};"),
      writeFile(join(artifactRoot, "manifest.json"), '{"id":"example-plugin"}'),
      writeFile(join(artifactRoot, "styles.css"), ".example {}"),
    ]);

    try {
      const result = await installBuiltPlugin(vaultPath, {
        pluginId: "example-plugin",
        artifactRoot,
      });
      expect(result.copied).toEqual(["main.js", "manifest.json", "styles.css"]);
      expect(existsSync(join(result.pluginDir, "main.js"))).toBe(true);
      expect(
        JSON.parse(
          await readFile(
            join(vaultPath, ".obsidian", "community-plugins.json"),
            "utf8",
          ),
        ),
      ).toEqual(["example-plugin"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a missing required artefact", async () => {
    const root = await mkdtemp(join(tmpdir(), "obsidian-runner-install-"));
    const vaultPath = join(root, "vault");
    const artifactRoot = join(root, "artefacts");
    await mkdir(join(vaultPath, ".obsidian"), { recursive: true });
    await mkdir(artifactRoot, { recursive: true });
    await writeFile(
      join(artifactRoot, "manifest.json"),
      '{"id":"example-plugin"}',
    );
    try {
      await expect(
        installBuiltPlugin(vaultPath, {
          pluginId: "example-plugin",
          artifactRoot,
        }),
      ).rejects.toThrowError("Required plug-in artefact is missing");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("writes explicitly supplied plug-in data without treating it as an artefact", async () => {
    const root = await mkdtemp(join(tmpdir(), "obsidian-runner-install-"));
    const vaultPath = join(root, "vault");
    const artifactRoot = join(root, "artefacts");
    await mkdir(join(vaultPath, ".obsidian"), { recursive: true });
    await mkdir(artifactRoot, { recursive: true });
    await Promise.all([
      writeFile(join(artifactRoot, "main.js"), "export {};"),
      writeFile(join(artifactRoot, "manifest.json"), '{"id":"example-plugin"}'),
    ]);

    try {
      const result = await installBuiltPlugin(vaultPath, {
        pluginId: "example-plugin",
        artifactRoot,
        pluginData: {
          schemaVersion: 1,
          mode: "automation",
          pendingRun: { requestId: "test-1", scenarios: ["smoke"] },
        },
      });
      expect(result.copied).toEqual(["main.js", "manifest.json"]);
      expect(
        JSON.parse(await readFile(join(result.pluginDir, "data.json"), "utf8")),
      ).toEqual({
        schemaVersion: 1,
        mode: "automation",
        pendingRun: { requestId: "test-1", scenarios: ["smoke"] },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("preserves existing plug-in data when none is supplied", async () => {
    const root = await mkdtemp(join(tmpdir(), "obsidian-runner-install-"));
    const vaultPath = join(root, "vault");
    const artifactRoot = join(root, "artefacts");
    const pluginDir = join(vaultPath, ".obsidian", "plugins", "example-plugin");
    await mkdir(pluginDir, { recursive: true });
    await mkdir(artifactRoot, { recursive: true });
    await Promise.all([
      writeFile(join(artifactRoot, "main.js"), "export {};"),
      writeFile(join(artifactRoot, "manifest.json"), '{"id":"example-plugin"}'),
      writeFile(join(pluginDir, "data.json"), '{"mode":"review"}\n'),
    ]);

    try {
      await installBuiltPlugin(vaultPath, {
        pluginId: "example-plugin",
        artifactRoot,
      });
      expect(await readFile(join(pluginDir, "data.json"), "utf8")).toBe(
        '{"mode":"review"}\n',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
