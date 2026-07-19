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

const releasePreparationOrder = [
  "@vrtmrz/ui-interactions",
  "@vrtmrz/obsidian-plugin-kit",
  "@vrtmrz/obsidian-test-session",
  "octagonal-wheels",
];

export function planReleaseSetPreparation({ selections, manifests, lockfile }) {
  if (!Array.isArray(selections) || selections.length === 0) {
    throw new Error("At least one package release must be selected");
  }

  const selectedVersions = new Map();
  for (const selection of selections) {
    const { packageName, version } = selection;
    if (!publishablePackages[packageName]) {
      throw new Error(`Unsupported package: ${packageName}`);
    }
    if (selectedVersions.has(packageName)) {
      throw new Error(`Package selected more than once: ${packageName}`);
    }
    selectedVersions.set(packageName, version);
  }

  const nextManifests = cloneJson(manifests);
  let nextLockfile = cloneJson(lockfile);
  const uiPackageName = "@vrtmrz/ui-interactions";
  const pluginKitPackageName = "@vrtmrz/obsidian-plugin-kit";
  const uiVersion = selectedVersions.get(uiPackageName);

  if (uiVersion && selectedVersions.has(pluginKitPackageName)) {
    const pluginKitManifest = nextManifests[pluginKitPackageName];
    if (!pluginKitManifest) {
      throw new Error(`Manifest is missing for ${pluginKitPackageName}`);
    }
    const pluginKitDirectory = publishablePackages[pluginKitPackageName];
    const pluginKitLockEntry = nextLockfile.packages?.[pluginKitDirectory];
    if (!pluginKitLockEntry) {
      throw new Error(`Lockfile entry is missing for ${pluginKitDirectory}`);
    }
    nextManifests[pluginKitPackageName] = {
      ...pluginKitManifest,
      dependencies: {
        ...pluginKitManifest.dependencies,
        [uiPackageName]: uiVersion,
      },
    };
    nextLockfile.packages[pluginKitDirectory] = {
      ...pluginKitLockEntry,
      dependencies: {
        ...pluginKitLockEntry.dependencies,
        [uiPackageName]: uiVersion,
      },
    };
  }

  const orderIndex = new Map(releasePreparationOrder.map((packageName, index) => [packageName, index]));
  const orderedSelections = [...selections].sort(
    (left, right) => orderIndex.get(left.packageName) - orderIndex.get(right.packageName),
  );
  const preparations = [];
  for (const { packageName, version } of orderedSelections) {
    const manifest = nextManifests[packageName];
    if (!manifest) throw new Error(`Manifest is missing for ${packageName}`);
    const uiManifest = nextManifests[uiPackageName];
    if (!uiManifest) throw new Error(`Manifest is missing for ${uiPackageName}`);

    const preparation = planReleasePreparation({
      packageName,
      version,
      manifest,
      lockfile: nextLockfile,
      uiManifest,
    });
    nextManifests[packageName] = preparation.manifest;
    nextLockfile = preparation.lockfile;
    preparations.push({ ...preparation, packageName, version });
  }

  return { manifests: nextManifests, lockfile: nextLockfile, preparations };
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
  const result = prepareReleaseSetMetadata({
    repositoryRoot,
    selections: [{ packageName, version }],
  });
  return result.preparations[0];
}

export function prepareReleaseSetMetadata({ repositoryRoot = defaultRepositoryRoot, selections }) {
  const selectedPackageNames = new Set(["@vrtmrz/ui-interactions"]);
  for (const { packageName } of selections) {
    const packageDirectory = publishablePackages[packageName];
    if (!packageDirectory) throw new Error(`Unsupported package: ${packageName}`);
    selectedPackageNames.add(packageName);
  }

  const manifests = {};
  for (const packageName of selectedPackageNames) {
    const packageDirectory = publishablePackages[packageName];
    manifests[packageName] = readJson(resolve(repositoryRoot, packageDirectory, "package.json"));
  }
  const lockfilePath = resolve(repositoryRoot, "package-lock.json");
  const result = planReleaseSetPreparation({
    selections,
    manifests,
    lockfile: readJson(lockfilePath),
  });

  for (const { packageName } of selections) {
    const packageDirectory = publishablePackages[packageName];
    writeJsonPreservingIndentation(
      resolve(repositoryRoot, packageDirectory, "package.json"),
      result.manifests[packageName],
    );
  }
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
  const args = process.argv.slice(2);
  if (args.length === 0 || args.length % 2 !== 0) {
    throw new Error(
      "Usage: npm run release:prepare -- <package-name> <version> [<package-name> <version> ...]",
    );
  }
  const selections = [];
  for (let index = 0; index < args.length; index += 2) {
    selections.push({ packageName: args[index], version: args[index + 1] });
  }

  const result = prepareReleaseSetMetadata({ selections });
  for (const preparation of result.preparations) {
    buildPreparedPackage({ packageName: preparation.packageName });
    process.stdout.write(
      `Prepared ${preparation.packageName}@${preparation.version} in ${preparation.packageDirectory}.\n`,
    );
  }
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
