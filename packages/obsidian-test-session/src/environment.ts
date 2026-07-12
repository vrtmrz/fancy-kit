import { accessSync, constants, existsSync } from "node:fs";
import { resolve } from "node:path";
import { platform } from "node:process";

/** The result of locating an Obsidian executable. */
export interface ObsidianDiscoveryResult {
  /** Resolved executable path when discovery succeeded. */
  binary?: string;
  /** Description of the successful discovery source. */
  source?: "environment" | "default-path";
  /** Candidate paths inspected during discovery. */
  checked: string[];
}

const defaultCandidatesByPlatform: Partial<
  Record<NodeJS.Platform, readonly string[]>
> = {
  darwin: [
    "/Applications/Obsidian.app/Contents/MacOS/Obsidian",
    "/Applications/Obsidian.app/Contents/MacOS/obsidian",
  ],
  linux: [
    "_testdata/obsidian/squashfs-root/obsidian",
    "_testdata/obsidian/squashfs-root/AppRun",
    "_testdata/obsidian/Obsidian-1.12.7-arm64.AppImage",
    "_testdata/obsidian/Obsidian-1.12.7-x86_64.AppImage",
    "/usr/bin/obsidian",
    "/usr/local/bin/obsidian",
    "/snap/bin/obsidian",
    "/opt/Obsidian/obsidian",
    "/opt/obsidian/obsidian",
    "/app/bin/obsidian",
  ],
  win32: [
    "C:\\Program Files\\Obsidian\\Obsidian.exe",
    "C:\\Program Files (x86)\\Obsidian\\Obsidian.exe",
  ],
};

const defaultCliCandidatesByPlatform: Partial<
  Record<NodeJS.Platform, readonly string[]>
> = {
  darwin: [
    "/Applications/Obsidian.app/Contents/MacOS/obsidian-cli",
    "/Applications/Obsidian.app/Contents/Resources/obsidian-cli",
    "/usr/local/bin/obsidian",
  ],
  linux: [
    "_testdata/obsidian/squashfs-root/obsidian-cli",
    "/usr/bin/obsidian-cli",
    "/usr/local/bin/obsidian-cli",
    "/snap/bin/obsidian-cli",
    "/opt/Obsidian/obsidian-cli",
    "/opt/obsidian/obsidian-cli",
  ],
  win32: [
    "C:\\Program Files\\Obsidian\\obsidian-cli.exe",
    "C:\\Program Files (x86)\\Obsidian\\obsidian-cli.exe",
  ],
};

function isUsableFile(path: string): boolean {
  const resolvedPath = resolve(path);
  if (!existsSync(resolvedPath)) return false;
  if (platform === "win32") return true;
  try {
    accessSync(resolvedPath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function discover(
  environmentPath: string | undefined,
  candidates: readonly string[],
): ObsidianDiscoveryResult {
  const checked: string[] = [];
  const requestedPath = environmentPath?.trim();
  if (requestedPath) {
    checked.push(requestedPath);
    if (isUsableFile(requestedPath)) {
      return { binary: resolve(requestedPath), source: "environment", checked };
    }
  }
  for (const candidate of candidates) {
    checked.push(candidate);
    if (isUsableFile(candidate))
      return { binary: resolve(candidate), source: "default-path", checked };
  }
  return { checked };
}

/**
 * Locates an Obsidian application executable.
 *
 * @param env - Environment containing an optional `OBSIDIAN_BINARY` override.
 * @returns Discovery details and all inspected paths.
 */
export function discoverObsidianBinary(
  env: NodeJS.ProcessEnv = process.env,
): ObsidianDiscoveryResult {
  return discover(
    env.OBSIDIAN_BINARY,
    defaultCandidatesByPlatform[platform] ?? [],
  );
}

/**
 * Locates or requires an Obsidian application executable.
 *
 * @param env - Environment containing an optional `OBSIDIAN_BINARY` override.
 * @returns The resolved executable path.
 */
export function requireObsidianBinary(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const result = discoverObsidianBinary(env);
  if (result.binary) return result.binary;
  throw new Error(
    [
      "Could not find an Obsidian executable.",
      "Set OBSIDIAN_BINARY to the installed Obsidian executable path.",
      `Checked paths: ${result.checked.length > 0 ? result.checked.join(", ") : "(none)"}`,
    ].join("\n"),
  );
}

/**
 * Locates an `obsidian-cli` executable.
 *
 * @param env - Environment containing an optional `OBSIDIAN_CLI` override.
 * @returns Discovery details and all inspected paths.
 */
export function discoverObsidianCli(
  env: NodeJS.ProcessEnv = process.env,
): ObsidianDiscoveryResult {
  return discover(
    env.OBSIDIAN_CLI,
    defaultCliCandidatesByPlatform[platform] ?? [],
  );
}

/**
 * Locates or requires an `obsidian-cli` executable.
 *
 * @param env - Environment containing an optional `OBSIDIAN_CLI` override.
 * @returns The resolved executable path.
 */
export function requireObsidianCli(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const result = discoverObsidianCli(env);
  if (result.binary) return result.binary;
  throw new Error(
    [
      "Could not find obsidian-cli.",
      "Set OBSIDIAN_CLI to the executable path.",
      `Checked paths: ${result.checked.length > 0 ? result.checked.join(", ") : "(none)"}`,
    ].join("\n"),
  );
}
