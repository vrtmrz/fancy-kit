import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { get } from "node:https";
import { join, resolve } from "node:path";
import { arch as currentNodeArchitecture } from "node:process";
import { pipeline } from "node:stream/promises";
import {
  DEFAULT_VALIDATED_OBSIDIAN_VERSION,
  allowUnverifiedObsidianVersion,
  resolveObsidianAppImageRelease,
  type ObsidianAppImageArchitecture,
  type ObsidianAppImageReleaseSelection,
  type ObsidianGitHubReleaseFetcher,
  type ObsidianReleaseSupport,
} from "./appimage-release.js";

export {
  DEFAULT_VALIDATED_OBSIDIAN_VERSION,
  VALIDATED_OBSIDIAN_RELEASES,
  allowUnverifiedObsidianVersion,
  fetchObsidianGitHubRelease,
  normaliseObsidianVersion,
  obsidianAppImageAssetName,
  obsidianAppImageUrl,
  resolveObsidianAppImageRelease,
  selectObsidianVersion,
  validatedObsidianRelease,
  type ObsidianAppImageArchitecture,
  type ObsidianAppImageAssetSource,
  type ObsidianAppImageReleaseSelection,
  type ObsidianGitHubRelease,
  type ObsidianGitHubReleaseAsset,
  type ObsidianGitHubReleaseFetcher,
  type ObsidianReleaseSupport,
  type ResolveObsidianAppImageReleaseOptions,
  type ObsidianVersionSelection,
  type ValidatedObsidianAppImageAsset,
  type ValidatedObsidianRelease,
} from "./appimage-release.js";

/** Options for explicitly downloading and extracting an Obsidian AppImage. */
export interface InstallObsidianAppImageOptions {
  /** Obsidian release version. Defaults to the reviewed E2E release. */
  version?: string;
  /** AppImage architecture. Defaults from the current Node architecture. */
  architecture?: ObsidianAppImageArchitecture;
  /** Managed download root. Defaults to `_testdata/obsidian`. */
  targetDirectory?: string;
  /** Complete AppImage URL override. */
  url?: string;
  /** Whether an unvalidated version may run as a labelled regression probe. */
  allowUnverifiedVersion?: boolean;
  /** Injectable GitHub Release metadata lookup. */
  fetchGitHubRelease?: ObsidianGitHubReleaseFetcher;
  /** Whether to download again when the verified AppImage already exists. */
  forceDownload?: boolean;
  /** Whether to extract the AppImage after download. Defaults to `true`. */
  extract?: boolean;
  /** Progress logger. Defaults to `console.log`. */
  log?: (message: string) => void;
}

/** Result of preparing a local Obsidian AppImage. */
export interface InstallObsidianAppImageResult {
  /** Selected Obsidian version. */
  version: string;
  /** Selected AppImage architecture. */
  architecture: ObsidianAppImageArchitecture;
  /** Whether the release belongs to the reviewed E2E matrix. */
  support: ObsidianReleaseSupport;
  /** Exact release asset name. */
  assetName: string;
  /** Complete download URL. */
  url: string;
  /** Verified or observed AppImage SHA-256 digest. */
  sha256: string;
  /** Version- and architecture-scoped installation directory. */
  installDirectory: string;
  /** Local AppImage path. */
  appImagePath: string;
  /** Expected extracted Obsidian executable path. */
  extractedBinary: string;
  /** Metadata describing the selected and prepared release. */
  metadataPath: string;
}

interface AppImageInstallMetadata {
  schemaVersion: 1;
  version: string;
  architecture: ObsidianAppImageArchitecture;
  support: ObsidianReleaseSupport;
  source: ObsidianAppImageReleaseSelection["source"];
  tag: string;
  assetName: string;
  url: string;
  sha256: string;
  preparedAt: string;
  extracted: boolean;
}

/** Maps a Node architecture to an official AppImage architecture. */
export function obsidianAppImageArchitecture(
  architecture: NodeJS.Architecture = currentNodeArchitecture,
): ObsidianAppImageArchitecture {
  if (architecture === "arm64") return "arm64";
  if (architecture === "x64") return "x86_64";
  throw new Error(
    `Unsupported architecture for Obsidian AppImage: ${architecture}`,
  );
}

/** Returns the managed directory for one exact version and architecture. */
export function obsidianAppImageInstallDirectory(
  targetDirectory: string,
  version: string,
  architecture: ObsidianAppImageArchitecture,
): string {
  return resolve(targetDirectory, version, architecture);
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function downloadToFile(
  url: string,
  destination: string,
  redirectsLeft = 5,
): Promise<void> {
  return new Promise((resolveDownload, reject) => {
    const request = get(url, (response) => {
      const statusCode = response.statusCode ?? 0;
      const location = response.headers.location;
      if (statusCode >= 300 && statusCode < 400 && location) {
        response.resume();
        if (redirectsLeft <= 0) {
          reject(new Error(`Too many redirects while downloading ${url}`));
          return;
        }
        downloadToFile(
          new URL(location, url).toString(),
          destination,
          redirectsLeft - 1,
        )
          .then(resolveDownload)
          .catch(reject);
        return;
      }
      if (statusCode === 404) {
        response.resume();
        reject(
          new Error(`Unknown or unsupported Obsidian AppImage asset: ${url}`),
        );
        return;
      }
      if (statusCode !== 200) {
        response.resume();
        reject(new Error(`Failed to download ${url}: HTTP ${statusCode}`));
        return;
      }

      pipeline(response, createWriteStream(destination, { mode: 0o755 }))
        .then(resolveDownload)
        .catch(reject);
    });
    request.on("error", reject);
  });
}

function extractAppImage(appImagePath: string, cwd: string): Promise<void> {
  return new Promise((resolveExtract, reject) => {
    const child = spawn(appImagePath, ["--appimage-extract"], {
      cwd,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolveExtract();
      else
        reject(
          new Error(
            `AppImage extraction failed. code=${code}, signal=${signal}`,
          ),
        );
    });
  });
}

async function readMetadata(
  metadataPath: string,
): Promise<AppImageInstallMetadata | undefined> {
  try {
    const value = JSON.parse(
      await readFile(metadataPath, "utf8"),
    ) as AppImageInstallMetadata;
    return value.schemaVersion === 1 ? value : undefined;
  } catch {
    return undefined;
  }
}

async function writeMetadata(
  metadataPath: string,
  metadata: AppImageInstallMetadata,
): Promise<void> {
  const temporaryPath = `${metadataPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(metadata, null, 2)}\n`);
  await rename(temporaryPath, metadataPath);
}

function metadataMatches(
  metadata: AppImageInstallMetadata | undefined,
  selection: ObsidianAppImageReleaseSelection,
  sha256: string,
): boolean {
  return (
    metadata?.version === selection.version &&
    metadata.architecture === selection.architecture &&
    metadata.assetName === selection.assetName &&
    metadata.url === selection.url &&
    metadata.sha256 === sha256
  );
}

async function prepareAppImage(
  selection: ObsidianAppImageReleaseSelection,
  appImagePath: string,
  previousMetadata: AppImageInstallMetadata | undefined,
  forceDownload: boolean,
  log: (message: string) => void,
): Promise<string> {
  if (existsSync(appImagePath) && !forceDownload) {
    const existingSha256 = await sha256File(appImagePath);
    if (
      selection.expectedSha256 === existingSha256 ||
      (selection.expectedSha256 === undefined &&
        metadataMatches(previousMetadata, selection, existingSha256))
    ) {
      log(`Using existing matching Obsidian AppImage: ${appImagePath}`);
      return existingSha256;
    }
    log(
      `Replacing Obsidian AppImage without a matching checksum and release record: ${appImagePath}`,
    );
  }

  const partialPath = `${appImagePath}.${process.pid}.partial`;
  await rm(partialPath, { force: true });
  try {
    log(`Downloading Obsidian AppImage: ${selection.url}`);
    log(`Destination: ${appImagePath}`);
    await downloadToFile(selection.url, partialPath);
    const downloadedSha256 = await sha256File(partialPath);
    if (
      selection.expectedSha256 !== undefined &&
      selection.expectedSha256 !== downloadedSha256
    ) {
      throw new Error(
        `Obsidian AppImage checksum mismatch. expected=${selection.expectedSha256}, actual=${downloadedSha256}`,
      );
    }
    await chmod(partialPath, 0o755);
    await rename(partialPath, appImagePath);
    return downloadedSha256;
  } finally {
    await rm(partialPath, { force: true });
  }
}

/**
 * Explicitly downloads and optionally extracts a local Obsidian AppImage.
 *
 * @remarks Importing the package never performs network or filesystem writes.
 */
export async function installObsidianAppImage(
  options: InstallObsidianAppImageOptions = {},
): Promise<InstallObsidianAppImageResult> {
  const architecture = options.architecture ?? obsidianAppImageArchitecture();
  const selection = await resolveObsidianAppImageRelease({
    version: options.version ?? DEFAULT_VALIDATED_OBSIDIAN_VERSION,
    architecture,
    allowUnverifiedVersion:
      options.allowUnverifiedVersion ?? allowUnverifiedObsidianVersion(),
    url: options.url,
    fetchGitHubRelease: options.fetchGitHubRelease,
  });
  const targetDirectory = resolve(
    options.targetDirectory?.trim() || "_testdata/obsidian",
  );
  const installDirectory = obsidianAppImageInstallDirectory(
    targetDirectory,
    selection.version,
    architecture,
  );
  const appImagePath = join(installDirectory, selection.assetName);
  const extractedRoot = join(installDirectory, "squashfs-root");
  const extractedBinary = join(extractedRoot, "obsidian");
  const metadataPath = join(installDirectory, "release.json");
  const log = options.log ?? console.log;

  await mkdir(installDirectory, { recursive: true });
  const previousMetadata = await readMetadata(metadataPath);
  const sha256 = await prepareAppImage(
    selection,
    appImagePath,
    previousMetadata,
    options.forceDownload === true,
    log,
  );
  const reusableExtraction =
    options.forceDownload !== true &&
    existsSync(extractedBinary) &&
    previousMetadata?.extracted === true &&
    metadataMatches(previousMetadata, selection, sha256);

  if (options.extract !== false) {
    if (reusableExtraction) {
      log(`Using existing extracted Obsidian binary: ${extractedBinary}`);
    } else {
      await rm(extractedRoot, { recursive: true, force: true });
      log(`Extracting Obsidian AppImage in ${installDirectory}`);
      await extractAppImage(appImagePath, installDirectory);
      if (!existsSync(extractedBinary)) {
        throw new Error(
          `Extracted Obsidian binary was not created: ${extractedBinary}`,
        );
      }
      log(`Extracted Obsidian binary: ${extractedBinary}`);
    }
  }

  await writeMetadata(metadataPath, {
    schemaVersion: 1,
    version: selection.version,
    architecture,
    support: selection.support,
    source: selection.source,
    tag: selection.tag,
    assetName: selection.assetName,
    url: selection.url,
    sha256,
    preparedAt: new Date().toISOString(),
    extracted: options.extract !== false,
  });

  if (selection.support === "unverified") {
    log(
      `Warning: Obsidian ${selection.version} is an unverified regression probe and does not establish supported-version status.`,
    );
  }

  return {
    version: selection.version,
    architecture,
    support: selection.support,
    assetName: selection.assetName,
    url: selection.url,
    sha256,
    installDirectory,
    appImagePath,
    extractedBinary,
    metadataPath,
  };
}
