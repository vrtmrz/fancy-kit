import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const releaseVersionPattern = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?$/;

export const publishablePackages = Object.freeze({
  "@vrtmrz/ui-interactions": "packages/ui-interactions",
  "@vrtmrz/obsidian-plugin-kit": "packages/obsidian-plugin-kit",
  "@vrtmrz/obsidian-test-session": "packages/obsidian-test-session",
  "octagonal-wheels": "packages/octagonal-wheels",
});

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
}) {
  const packageDirectory = publishablePackages[packageName];
  if (!packageDirectory) throw new Error(`Unsupported package: ${packageName}`);
  if (!releaseVersionPattern.test(expectedVersion)) {
    throw new Error(`Invalid semantic version: ${expectedVersion}`);
  }
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error("Expected SHA must contain 40 lowercase hexadecimal characters");
  if (expectedSha !== actualSha) throw new Error(`Expected commit ${expectedSha}, but the workflow is running ${actualSha}`);
  if (manifest.name !== packageName) throw new Error(`Manifest name is ${manifest.name}, not ${packageName}`);
  if (manifest.version !== expectedVersion) throw new Error(`Manifest version is ${manifest.version}, not ${expectedVersion}`);
  if (lockEntry?.version !== expectedVersion) throw new Error(`Lockfile version is ${lockEntry?.version ?? "missing"}, not ${expectedVersion}`);
  if (distTag !== "next") throw new Error("Staged releases must use the next dist-tag");

  const requiredConfirmation = `stage ${packageName}@${expectedVersion} from ${expectedSha}`;
  if (confirmation !== requiredConfirmation) throw new Error(`Confirmation must be exactly: ${requiredConfirmation}`);

  if (packageName === "@vrtmrz/obsidian-plugin-kit") {
    const uiVersion = manifest.dependencies?.["@vrtmrz/ui-interactions"];
    if (uiVersion !== uiManifest.version) {
      throw new Error(`The plug-in kit requires UI interactions ${uiVersion ?? "without an exact version"}, but the workspace contains ${uiManifest.version}`);
    }
    if (lockEntry.dependencies?.["@vrtmrz/ui-interactions"] !== uiVersion) {
      throw new Error("The plug-in kit UI interactions dependency does not match the lockfile");
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
  if (packageName !== "@vrtmrz/obsidian-plugin-kit") return;
  const dependency = "@vrtmrz/ui-interactions";
  const version = manifest.dependencies?.[dependency];
  const response = await fetchImpl(`https://registry.npmjs.org/${encodeURIComponent(dependency)}/${encodeURIComponent(version)}`);
  if (!response.ok) throw new Error(`${dependency}@${version} must be published before the plug-in kit can be staged`);
}

async function main() {
  const [packageName, expectedVersion, distTag, expectedSha, actualSha, confirmation] = process.argv.slice(2);
  if (!confirmation) {
    throw new Error("Usage: node scripts/validate-release-selection.mjs <package> <version> <dist-tag> <expected-sha> <actual-sha> <confirmation>");
  }

  const packageDirectory = publishablePackages[packageName];
  if (!packageDirectory) throw new Error(`Unsupported package: ${packageName}`);
  const manifest = readJson(`${packageDirectory}/package.json`);
  const lockfile = readJson("package-lock.json");
  const uiManifest = readJson("packages/ui-interactions/package.json");
  const lockEntry = lockfile.packages?.[packageDirectory];

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
