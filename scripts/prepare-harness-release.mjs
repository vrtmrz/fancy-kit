import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRepositoryRoot = fileURLToPath(new URL("../", import.meta.url));

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function gitText(repositoryRoot, args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
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
  for (const file of [
    "main.js",
    "manifest.json",
    "styles.css",
    "versions.json",
  ]) {
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

  const files = [
    "main.js",
    "manifest.json",
    "styles.css",
    "versions.json",
    "SOURCE.json",
  ];
  const checksums = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(resolve(outputDirectory, file));
      return `${createHash("sha256").update(content).digest("hex")}  ${file}`;
    }),
  );
  await writeFile(
    resolve(outputDirectory, "SHA256SUMS"),
    `${checksums.join("\n")}\n`,
  );
  return { outputDirectory, source };
}

async function main() {
  const result = await prepareHarnessRelease();
  console.log(`Prepared Fancy Kit Harness assets in ${result.outputDirectory}`);
  if (result.source.includesUncommittedChanges) {
    console.warn(
      "The source worktree contains tracked changes. Rebuild from the reviewed clean commit before releasing.",
    );
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
