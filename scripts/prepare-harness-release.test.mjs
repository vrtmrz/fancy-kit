import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  encodeScrewdriverText,
  prepareHarnessRelease,
} from "./prepare-harness-release.mjs";

function decodeScrewdriverText(content) {
  let restored = content.replace(/\\`/g, "`").replace(/\\\\/g, "\\");
  restored = restored.substring(0, restored.lastIndexOf("\n"));
  return restored;
}

test("prepares a traceable Screwdriver document from the harness application", async () => {
  const root = await mkdtemp(join(tmpdir(), "fancy-kit-harness-release-"));
  const app = join(root, "apps/obsidian-harness");
  await mkdir(app, { recursive: true });
  const pluginFiles = new Map([
    ["main.js", "const path = \"C:\\\\test\";\nconst value = `example`;\n"],
    ["styles.css", ".harness::before { content: \"`\\\\\"; }\n"],
    [
      "manifest.json",
      `${JSON.stringify({ version: "0.1.0", minAppVersion: "1.8.7" })}\n`,
    ],
  ]);
  await Promise.all([
    ...[...pluginFiles].map(([file, content]) =>
      writeFile(join(app, file), content),
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
    assert.equal(
      result.screwdriverDocument,
      "fancy-kit-harness-0.1.0-screwdriver.md",
    );
    const document = await readFile(
      join(result.outputDirectory, result.screwdriverDocument),
      "utf8",
    );
    assert.match(document, /Source commit: `0123456789abcdef`/);
    assert.match(document, /Includes uncommitted changes: `false`/);
    assert.doesNotMatch(document, /community-plugins\.json/);
    assert.doesNotMatch(document, /fancy-kit-harness\/data\.json/);
    assert.equal(
      result.screwdriverChecksum,
      createHash("sha256").update(document).digest("hex"),
    );
    assert.equal(
      result.installerUrl,
      `https://vrtmrz.github.io/fancy-kit/harness/?version=0.1.0&sha256=${result.screwdriverChecksum}`,
    );
    const installerInstructions = await readFile(
      join(result.outputDirectory, result.installerInstructions),
      "utf8",
    );
    assert.match(
      installerInstructions,
      new RegExp(result.installerUrl.replace(/[.?]/g, "\\$&")),
    );
    assert.match(installerInstructions, new RegExp(result.screwdriverChecksum));

    const restoredFiles = new Map();
    for (const match of document.matchAll(
      /^```screwdriver:([^\n]+)\n([\s\S]*?)^```/gm,
    )) {
      const [path, type, mtime] = match[1].split(":");
      assert.equal(type, "plain");
      assert.equal(mtime, "0");
      restoredFiles.set(path, decodeScrewdriverText(match[2]));
    }
    assert.equal(restoredFiles.size, 3);
    for (const [file, content] of pluginFiles) {
      assert.equal(
        restoredFiles.get(`.obsidian/plugins/fancy-kit-harness/${file}`),
        content,
      );
    }

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
      result.screwdriverDocument,
      result.installerInstructions,
    ]) {
      assert.match(checksums, new RegExp(`  ${file}\\n`));
    }
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("uses the escaping order expected by Screwdriver", () => {
  const source = "before \\\\`middle` after\n```nested\n";
  const encoded = `${encodeScrewdriverText(source)}\n`;
  assert.equal(decodeScrewdriverText(encoded), source);
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
