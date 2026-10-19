import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const releaseVersionPattern = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?$/;

export function isReleaseVersion(version) {
  return releaseVersionPattern.test(version);
}

export const publishablePackages = Object.freeze({
  "@vrtmrz/ui-interactions": "packages/ui-interactions",
  "@vrtmrz/browser-ui-kit": "packages/browser-ui-kit",
  "@vrtmrz/obsidian-plugin-kit": "packages/obsidian-plugin-kit",
  "@vrtmrz/obsidian-test-session": "packages/obsidian-test-session",
  "@vrtmrz/secret-store": "packages/secret-store",
  "@vrtmrz/secret-store-node": "packages/secret-store-node",
  "@vrtmrz/local-storage": "packages/local-storage",
  "octagonal-wheels": "packages/octagonal-wheels",
});

function dependsOnUiInteractions(packageName) {
  return (
    packageName === "@vrtmrz/browser-ui-kit" ||
    packageName === "@vrtmrz/obsidian-plugin-kit"
  );
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, new URL(`file://${repositoryRoot}/`)), "utf8"));
}

export function validateReleaseSelection({
  packageName,
  expectedVersion,
  distTag,
  expectedSha,
  actualSha,
  confirmation,
  manifest,
  lockEntry,
  uiManifest,
  secretStoreManifest,
  localStorageManifest,
}) {
  const packageDirectory = publishablePackages[packageName];
  if (!packageDirectory) throw new Error(`Unsupported package: ${packageName}`);
  if (!isReleaseVersion(expectedVersion)) {
    throw new Error(`Invalid semantic version: ${expectedVersion}`);
  }
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error("Expected SHA must contain 40 lowercase hexadecimal characters");
  if (expectedSha !== actualSha) throw new Error(`Expected commit ${expectedSha}, but the workflow is running ${actualSha}`);
  if (manifest.name !== packageName) throw new Error(`Manifest name is ${manifest.name}, not ${packageName}`);
  if (manifest.version !== expectedVersion) throw new Error(`Manifest version is ${manifest.version}, not ${expectedVersion}`);
  if (lockEntry?.version !== expectedVersion) throw new Error(`Lockfile version is ${lockEntry?.version ?? "missing"}, not ${expectedVersion}`);
  if (distTag !== "next" && distTag !== "latest") throw new Error("Staged release dist-tag must be next or latest");
  if (distTag === "latest" && expectedVersion.includes("-")) throw new Error("Prereleases must use the next dist-tag");

  const requiredConfirmation = `stage ${packageName}@${expectedVersion} to ${distTag} from ${expectedSha}`;
  if (confirmation !== requiredConfirmation) throw new Error(`Confirmation must be exactly: ${requiredConfirmation}`);

  if (dependsOnUiInteractions(packageName)) {
    const uiVersion = manifest.dependencies?.["@vrtmrz/ui-interactions"];
    if (uiVersion !== uiManifest.version) {
      throw new Error(
        `${packageName} requires UI interactions ${uiVersion ?? "without an exact version"}, but the workspace contains ${uiManifest.version}`,
      );
    }
    if (lockEntry.dependencies?.["@vrtmrz/ui-interactions"] !== uiVersion) {
      throw new Error(`${packageName} UI interactions dependency does not match the lockfile`);
    }
  }

  if (
    packageName === "@vrtmrz/obsidian-plugin-kit" ||
    packageName === "@vrtmrz/secret-store-node"
  ) {
    const dependency = "@vrtmrz/secret-store";
    const secretStoreVersion = manifest.dependencies?.[dependency];
    if (
      !isReleaseVersion(secretStoreVersion) ||
      !isReleaseVersion(secretStoreManifest?.version) ||
      secretStoreVersion !== secretStoreManifest.version
    ) {
      throw new Error(
        `${packageName} requires ${dependency} ${secretStoreVersion ?? "without an exact version"}, but the workspace contains ${secretStoreManifest?.version ?? "no valid manifest version"}`,
      );
    }
    if (lockEntry.dependencies?.[dependency] !== secretStoreVersion) {
      throw new Error(`${packageName} SecretStore dependency does not match the lockfile`);
    }
  }

  if (packageName === "@vrtmrz/obsidian-plugin-kit") {
    const dependency = "@vrtmrz/local-storage";
    const localStorageVersion = manifest.dependencies?.[dependency];
    if (
      !isReleaseVersion(localStorageVersion) ||
      !isReleaseVersion(localStorageManifest?.version) ||
      localStorageVersion !== localStorageManifest.version
    ) {
      throw new Error(
        `${packageName} requires ${dependency} ${localStorageVersion ?? "without an exact version"}, but the workspace contains ${localStorageManifest?.version ?? "no valid manifest version"}`,
      );
    }
    if (lockEntry.dependencies?.[dependency] !== localStorageVersion) {
      throw new Error(`${packageName} local-storage dependency does not match the lockfile`);
    }
  }

  return { packageDirectory, requiredConfirmation };
}

export async function assertVersionIsUnpublished(packageName, version, fetchImpl = fetch) {
  const response = await fetchImpl(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`);
  if (response.status === 404) return;
  if (response.ok) throw new Error(`${packageName}@${version} is already present on npm`);
  throw new Error(`npm registry returned HTTP ${response.status} while checking ${packageName}@${version}`);
}

export async function assertKitDependencyIsPublished(packageName, manifest, fetchImpl = fetch) {
  const dependencies = [];
  if (dependsOnUiInteractions(packageName)) dependencies.push("@vrtmrz/ui-interactions");
  if (
    packageName === "@vrtmrz/obsidian-plugin-kit" ||
    packageName === "@vrtmrz/secret-store-node"
  ) {
    dependencies.push("@vrtmrz/secret-store");
  }
  if (packageName === "@vrtmrz/obsidian-plugin-kit") {
    dependencies.push("@vrtmrz/local-storage");
  }

  for (const dependency of dependencies) {
    const version = manifest.dependencies?.[dependency];
    const response = await fetchImpl(`https://registry.npmjs.org/${encodeURIComponent(dependency)}/${encodeURIComponent(version)}`);
    if (!response.ok) {
      throw new Error(
        `${dependency}@${version} must be published before ${packageName} can be staged`,
      );
    }
  }
}

export function readReleaseSelectionMetadata(packageName, read = readJson) {
  const packageDirectory = publishablePackages[packageName];
  if (!packageDirectory) throw new Error(`Unsupported package: ${packageName}`);

  const manifest = read(`${packageDirectory}/package.json`);
  const lockfile = read("package-lock.json");
  const metadata = {
    manifest,
    lockEntry: lockfile.packages?.[packageDirectory],
    uiManifest: read("packages/ui-interactions/package.json"),
  };
  if (
    packageName === "@vrtmrz/obsidian-plugin-kit" ||
    packageName === "@vrtmrz/secret-store-node"
  ) {
    metadata.secretStoreManifest = read("packages/secret-store/package.json");
  }
  if (packageName === "@vrtmrz/obsidian-plugin-kit") {
    metadata.localStorageManifest = read("packages/local-storage/package.json");
  }
  return metadata;
}

async function main() {
  const [packageName, expectedVersion, distTag, expectedSha, actualSha, confirmation] = process.argv.slice(2);
  if (!confirmation) {
    throw new Error("Usage: node scripts/validate-release-selection.mjs <package> <version> <dist-tag> <expected-sha> <actual-sha> <confirmation>");
  }

  const { manifest, lockEntry, uiManifest, secretStoreManifest, localStorageManifest } =
    readReleaseSelectionMetadata(packageName);

  const result = validateReleaseSelection({
    packageName,
    expectedVersion,
    distTag,
    expectedSha,
    actualSha,
    confirmation,
    manifest,
    lockEntry,
    uiManifest,
    secretStoreManifest,
    localStorageManifest,
  });
  await assertVersionIsUnpublished(packageName, expectedVersion);
  await assertKitDependencyIsPublished(packageName, manifest);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
