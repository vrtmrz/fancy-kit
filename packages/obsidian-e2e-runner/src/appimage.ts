import { spawn } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { chmod, mkdir } from "node:fs/promises";
import { get } from "node:https";
import { basename, join, resolve } from "node:path";
import { arch as currentNodeArchitecture } from "node:process";

/** Supported Obsidian AppImage architecture names. */
export type ObsidianAppImageArchitecture = "arm64" | "x86_64";

/** Options for explicitly downloading and extracting an Obsidian AppImage. */
export interface InstallObsidianAppImageOptions {
  /** Obsidian release version. Defaults to `1.12.7`. */
  version?: string;
  /** AppImage architecture. Defaults from the current Node architecture. */
  architecture?: ObsidianAppImageArchitecture;
  /** Download and extraction directory. Defaults to `_testdata/obsidian`. */
  targetDirectory?: string;
  /** Complete AppImage URL override. */
  url?: string;
  /** Whether to download again when the AppImage already exists. */
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
  /** Download URL. */
  url: string;
  /** Local AppImage path. */
  appImagePath: string;
  /** Expected extracted Obsidian executable path. */
  extractedBinary: string;
}

/**
 * Maps a Node architecture to an Obsidian AppImage architecture.
 *
 * @param architecture - Node architecture name.
 * @returns The corresponding AppImage architecture.
 */
export function obsidianAppImageArchitecture(
  architecture: NodeJS.Architecture = currentNodeArchitecture,
): ObsidianAppImageArchitecture {
  if (architecture === "arm64") return "arm64";
  if (architecture === "x64") return "x86_64";
  throw new Error(
    `Unsupported architecture for Obsidian AppImage: ${architecture}`,
  );
}

/**
 * Builds the official Obsidian AppImage release URL.
 *
 * @param version - Obsidian release version.
 * @param architecture - AppImage architecture.
 * @returns The official release asset URL.
 */
export function obsidianAppImageUrl(
  version: string,
  architecture: ObsidianAppImageArchitecture,
): string {
  return `https://github.com/obsidianmd/obsidian-releases/releases/download/v${version}/Obsidian-${version}-${architecture}.AppImage`;
}

function download(
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
        download(
          new URL(location, url).toString(),
          destination,
          redirectsLeft - 1,
        )
          .then(resolveDownload)
          .catch(reject);
        return;
      }
      if (statusCode !== 200) {
        response.resume();
        reject(new Error(`Failed to download ${url}: HTTP ${statusCode}`));
        return;
      }

      const file = createWriteStream(destination, { mode: 0o755 });
      response.pipe(file);
      file.on("finish", () => {
        file.close((error) => {
          if (error) reject(error);
          else resolveDownload();
        });
      });
      file.on("error", reject);
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

/**
 * Explicitly downloads and optionally extracts a local Obsidian AppImage.
 *
 * @param options - Version, architecture, location, and download options.
 * @returns The selected release and local paths.
 *
 * @remarks Importing the package never downloads Obsidian; only this explicit operation performs network and filesystem writes.
 */
export async function installObsidianAppImage(
  options: InstallObsidianAppImageOptions = {},
): Promise<InstallObsidianAppImageResult> {
  const version = options.version?.trim() || "1.12.7";
  const architecture = options.architecture ?? obsidianAppImageArchitecture();
  const targetDirectory = resolve(
    options.targetDirectory?.trim() || "_testdata/obsidian",
  );
  const url = options.url?.trim() || obsidianAppImageUrl(version, architecture);
  const appImagePath = join(targetDirectory, basename(new URL(url).pathname));
  const extractedBinary = join(targetDirectory, "squashfs-root", "obsidian");
  const log = options.log ?? console.log;

  await mkdir(targetDirectory, { recursive: true });
  if (!existsSync(appImagePath) || options.forceDownload === true) {
    log(`Downloading Obsidian AppImage: ${url}`);
    log(`Destination: ${appImagePath}`);
    await download(url, appImagePath);
    await chmod(appImagePath, 0o755);
  } else {
    log(`Using existing Obsidian AppImage: ${appImagePath}`);
  }

  if (options.extract !== false) {
    if (existsSync(extractedBinary)) {
      log(`Using existing extracted Obsidian binary: ${extractedBinary}`);
    } else {
      log(`Extracting Obsidian AppImage in ${targetDirectory}`);
      await extractAppImage(appImagePath, targetDirectory);
      log(`Extracted Obsidian binary: ${extractedBinary}`);
    }
  }

  return { version, architecture, url, appImagePath, extractedBinary };
}
