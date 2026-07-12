import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isReleaseVersion, publishablePackages } from "./validate-release-selection.mjs";

const defaultRepositoryRoot = fileURLToPath(new URL("../", import.meta.url));

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function comparePrerelease(left, right) {
  if (left === undefined && right === undefined) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;

  const leftParts = left.split(".");
  const rightParts = right.split(".");
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;

    const leftNumeric = /^\d+$/.test(leftPart);
    const rightNumeric = /^\d+$/.test(rightPart);
    if (leftNumeric && rightNumeric) return BigInt(leftPart) < BigInt(rightPart) ? -1 : 1;
    if (leftNumeric) return -1;
    if (rightNumeric) return 1;
    return leftPart < rightPart ? -1 : 1;
  }
  return 0;
}

export function compareReleaseVersions(left, right) {
  const [leftCore, leftPrerelease] = left.split(/-(.*)/s, 2);
  const [rightCore, rightPrerelease] = right.split(/-(.*)/s, 2);
  const leftParts = leftCore.split(".").map(BigInt);
  const rightParts = rightCore.split(".").map(BigInt);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] < rightParts[index] ? -1 : 1;
  }
  return comparePrerelease(leftPrerelease, rightPrerelease);
}

export function planReleasePreparation({ packageName, version, manifest, lockfile, uiManifest }) {
  const packageDirectory = publishablePackages[packageName];
  if (!packageDirectory) throw new Error(`Unsupported package: ${packageName}`);
  if (!isReleaseVersion(version)) throw new Error(`Invalid semantic version: ${version}`);
  if (manifest.name !== packageName) throw new Error(`Manifest name is ${manifest.name}, not ${packageName}`);
  if (!isReleaseVersion(manifest.version)) throw new Error(`Invalid current manifest version: ${manifest.version}`);

  const lockEntry = lockfile.packages?.[packageDirectory];
  if (!lockEntry) throw new Error(`Lockfile entry is missing for ${packageDirectory}`);
  if (lockEntry.version !== manifest.version) {
    throw new Error(`Manifest version ${manifest.version} does not match lockfile version ${lockEntry.version}`);
  }
  if (manifest.version === version) throw new Error(`${packageName} is already version ${version}`);
  if (compareReleaseVersions(version, manifest.version) <= 0) {
    throw new Error(`Release version ${version} must be greater than current version ${manifest.version}`);
  }

  if (packageName === "@vrtmrz/obsidian-plugin-kit") {
    const dependency = "@vrtmrz/ui-interactions";
    const uiVersion = manifest.dependencies?.[dependency];
    if (uiVersion !== uiManifest.version) {
      throw new Error(`The plug-in kit requires ${dependency} ${uiVersion ?? "without an exact version"}, but the workspace contains ${uiManifest.version}`);
    }
    if (lockEntry.dependencies?.[dependency] !== uiVersion) {
      throw new Error("The plug-in kit UI interactions dependency does not match the lockfile");
    }
  }

  const nextManifest = { ...manifest, version };
  const nextLockfile = cloneJson(lockfile);
  nextLockfile.packages[packageDirectory].version = version;
  return { packageDirectory, manifest: nextManifest, lockfile: nextLockfile };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJsonPreservingIndentation(path, value) {
  const current = readFileSync(path, "utf8");
  const indent = current.match(/\n(\s+)"/)?.[1].length ?? 2;
  writeFileSync(path, `${JSON.stringify(value, null, indent)}\n`);
}

export function prepareReleaseMetadata({ repositoryRoot = defaultRepositoryRoot, packageName, version }) {
  const packageDirectory = publishablePackages[packageName];
  if (!packageDirectory) throw new Error(`Unsupported package: ${packageName}`);

  const manifestPath = resolve(repositoryRoot, packageDirectory, "package.json");
  const lockfilePath = resolve(repositoryRoot, "package-lock.json");
  const uiManifestPath = resolve(repositoryRoot, "packages/ui-interactions/package.json");
  const result = planReleasePreparation({
    packageName,
    version,
    manifest: readJson(manifestPath),
    lockfile: readJson(lockfilePath),
    uiManifest: readJson(uiManifestPath),
  });

  writeJsonPreservingIndentation(manifestPath, result.manifest);
  writeJsonPreservingIndentation(lockfilePath, result.lockfile);
  return result;
}

export function buildPreparedPackage({ repositoryRoot = defaultRepositoryRoot, packageName, spawn = spawnSync }) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawn(npmCommand, ["run", "build", "--workspace", packageName], {
    cwd: repositoryRoot,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Build failed for ${packageName} with exit code ${result.status ?? "unknown"}`);
}

function main() {
  const [packageName, version] = process.argv.slice(2);
  if (!packageName || !version) {
    throw new Error("Usage: npm run release:prepare -- <package-name> <version>");
  }

  const result = prepareReleaseMetadata({ packageName, version });
  buildPreparedPackage({ packageName });
  process.stdout.write(`Prepared ${packageName}@${version} in ${result.packageDirectory}.\n`);
  process.stdout.write("Run npm run verify:workspace before committing the release preparation.\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
