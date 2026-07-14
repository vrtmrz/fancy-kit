import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareHarnessRelease } from "./prepare-harness-release.mjs";

test("prepares traceable BRAT assets from the harness application", async () => {
  const root = await mkdtemp(join(tmpdir(), "fancy-kit-harness-release-"));
  const app = join(root, "apps/obsidian-harness");
  await mkdir(app, { recursive: true });
  await Promise.all([
    writeFile(join(app, "main.js"), "built"),
    writeFile(join(app, "styles.css"), ".harness {}"),
    writeFile(
      join(app, "manifest.json"),
      JSON.stringify({ version: "0.1.0", minAppVersion: "1.8.7" }),
    ),
    writeFile(join(app, "versions.json"), '{"0.1.0":"1.8.7"}'),
  ]);

  try {
    const result = await prepareHarnessRelease({
      repositoryRoot: root,
      sourceCommit: "0123456789abcdef",
      sourceDirty: false,
    });
    assert.deepEqual(result.source, {
      repository: "https://github.com/vrtmrz/fancy-kit",
      commit: "0123456789abcdef",
      includesUncommittedChanges: false,
      application: "apps/obsidian-harness",
      version: "0.1.0",
    });
    const checksums = await readFile(
      join(result.outputDirectory, "SHA256SUMS"),
      "utf8",
    );
    for (const file of [
      "main.js",
      "manifest.json",
      "styles.css",
      "versions.json",
      "SOURCE.json",
    ]) {
      assert.match(checksums, new RegExp(`  ${file}\\n`));
    }
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("marks an untracked source file as an uncommitted change", async () => {
  const root = await mkdtemp(join(tmpdir(), "fancy-kit-harness-release-"));
  const app = join(root, "apps/obsidian-harness");
  await mkdir(app, { recursive: true });
  await Promise.all([
    writeFile(join(app, "main.js"), "built"),
    writeFile(join(app, "styles.css"), ".harness {}"),
    writeFile(
      join(app, "manifest.json"),
      JSON.stringify({ version: "0.1.0", minAppVersion: "1.8.7" }),
    ),
    writeFile(join(app, "versions.json"), '{"0.1.0":"1.8.7"}'),
  ]);
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Fancy Kit test"], {
    cwd: root,
  });
  execFileSync("git", ["config", "user.email", "test@example.invalid"], {
    cwd: root,
  });
  execFileSync("git", ["add", "apps"], { cwd: root });
  execFileSync("git", ["commit", "--quiet", "-m", "Add harness fixture"], {
    cwd: root,
  });
  await writeFile(join(app, "untracked-source.ts"), "export {};\n");

  try {
    const result = await prepareHarnessRelease({
      repositoryRoot: root,
      sourceCommit: "0123456789abcdef",
    });
    assert.equal(result.source.includesUncommittedChanges, true);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
