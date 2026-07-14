import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRepositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const harnessPluginFiles = ["main.js", "manifest.json", "styles.css"];
const harnessInstallerUrl = "https://vrtmrz.github.io/fancy-kit/harness/";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function gitText(repositoryRoot, args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function encodeScrewdriverText(content) {
  return content.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}

function createScrewdriverBlock(path, content) {
  return [
    `\`\`\`screwdriver:${path}:plain:0`,
    encodeScrewdriverText(content),
    "```",
  ].join("\n");
}

function createScrewdriverDocument({ source, contents, checksums }) {
  const sourceUrl = `${source.repository}/tree/${source.commit}/${source.application}`;
  const pluginRoot = ".obsidian/plugins/fancy-kit-harness";
  const blocks = harnessPluginFiles.map((file) =>
    createScrewdriverBlock(`${pluginRoot}/${file}`, contents.get(file)),
  );

  return `---
targets: []
urls: []
ignores: []
filters: []
comment: "Generated Fancy Kit Harness review bundle"
adjustObsidianDir: true
skipNewFile: false
skipOldFile: false
---

# Fancy Kit Harness ${source.version}

This document installs a reviewed Fancy Kit Harness build for real-device testing. Use it only in a disposable, dedicated test Vault, and restore it only when you trust its source.

- Source: ${sourceUrl}
- Source commit: \`${source.commit}\`
- Includes uncommitted changes: \`${source.includesUncommittedChanges}\`
- Plug-in ID: \`fancy-kit-harness\`

## Included files

${harnessPluginFiles.map((file) => `- \`${file}\`: \`${checksums.get(file)}\``).join("\n")}

This document restores only the three files above. It does not modify the enabled plug-in list or create a Harness \`data.json\` file.

## Restore and run

1. Install and enable Screwdriver in the dedicated test Vault.
2. Copy this document into that Vault, then open it as the active note.
3. Run the command \`Screwdriver: Restore files from this note\`.
4. Reload or restart Obsidian so it discovers the restored plug-in.
5. Open **Settings → Community plugins**, enable **Fancy Kit Harness**, then run \`Fancy Kit Harness: Open harness\`.
6. Select the required review mode and scenarios. The Harness stores its own settings only after it starts.

${blocks.join("\n\n")}
`;
}

function createInstallerLink(version, checksum) {
  const url = new URL(harnessInstallerUrl);
  url.searchParams.set("version", version);
  url.searchParams.set("sha256", checksum);
  return url.href;
}

export async function prepareHarnessRelease({
  repositoryRoot = defaultRepositoryRoot,
  outputDirectory = resolve(repositoryRoot, "dist/fancy-kit-harness"),
  sourceCommit = gitText(repositoryRoot, ["rev-parse", "HEAD"]),
  sourceDirty =
    gitText(repositoryRoot, ["status", "--porcelain"]).length > 0,
} = {}) {
  const appDirectory = resolve(repositoryRoot, "apps/obsidian-harness");
  const manifest = await readJson(resolve(appDirectory, "manifest.json"));
  const versions = await readJson(resolve(appDirectory, "versions.json"));
  if (versions[manifest.version] !== manifest.minAppVersion) {
    throw new Error(
      `versions.json must map ${manifest.version} to ${manifest.minAppVersion}`,
    );
  }

  await rm(outputDirectory, { force: true, recursive: true });
  await mkdir(outputDirectory, { recursive: true });
  for (const file of [...harnessPluginFiles, "versions.json"]) {
    await cp(resolve(appDirectory, file), resolve(outputDirectory, file));
  }

  const source = {
    repository: "https://github.com/vrtmrz/fancy-kit",
    commit: sourceCommit,
    includesUncommittedChanges: sourceDirty,
    application: "apps/obsidian-harness",
    version: manifest.version,
  };
  await writeFile(
    resolve(outputDirectory, "SOURCE.json"),
    `${JSON.stringify(source, null, 2)}\n`,
  );

  const metadataFiles = [...harnessPluginFiles, "versions.json", "SOURCE.json"];
  const contents = new Map(
    await Promise.all(
      metadataFiles.map(async (file) => [
        file,
        await readFile(resolve(outputDirectory, file)),
      ]),
    ),
  );
  const checksumByFile = new Map(
    [...contents].map(([file, content]) => [file, sha256(content)]),
  );
  const screwdriverDocument =
    `fancy-kit-harness-${manifest.version}-screwdriver.md`;
  const screwdriverContent = createScrewdriverDocument({
    source,
    contents: new Map(
      harnessPluginFiles.map((file) => [file, contents.get(file).toString()]),
    ),
    checksums: checksumByFile,
  });
  await writeFile(
    resolve(outputDirectory, screwdriverDocument),
    screwdriverContent,
  );
  const screwdriverChecksum = sha256(screwdriverContent);
  const installerUrl = createInstallerLink(
    manifest.version,
    screwdriverChecksum,
  );
  const installerInstructions = "INSTALLER.md";
  await writeFile(
    resolve(outputDirectory, installerInstructions),
    `## Install in a dedicated test Vault

[Copy the verified Harness bundle and open it in Obsidian](${installerUrl})

The installer requires Screwdriver. It asks for the dedicated Vault name or ID, verifies the release bundle against \`${screwdriverChecksum}\`, copies it to the Clipboard, and opens a versioned note through Obsidian URI. After the note opens, run \`Screwdriver: Restore files from this note\`.
`,
  );

  const files = [...metadataFiles, screwdriverDocument, installerInstructions];
  const checksums = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(resolve(outputDirectory, file));
      return `${sha256(content)}  ${file}`;
    }),
  );
  await writeFile(
    resolve(outputDirectory, "SHA256SUMS"),
    `${checksums.join("\n")}\n`,
  );
  return {
    outputDirectory,
    source,
    screwdriverDocument,
    screwdriverChecksum,
    installerInstructions,
    installerUrl,
  };
}

async function main() {
  const result = await prepareHarnessRelease();
  console.log(`Prepared Fancy Kit Harness assets in ${result.outputDirectory}`);
  console.log(`Installer: ${result.installerUrl}`);
  if (result.source.includesUncommittedChanges) {
    console.warn(
      "The source worktree contains uncommitted changes. Rebuild from the reviewed clean commit before distribution.",
    );
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
