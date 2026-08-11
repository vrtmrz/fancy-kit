import { accessSync, constants, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { platform } from "node:process";
import {
  allowUnverifiedObsidianVersion,
  obsidianAppImageArchitecture,
  obsidianAppImageInstallDirectory,
  selectObsidianVersion,
  type ObsidianVersionSelection,
} from "./appimage.js";

/** The result of locating an Obsidian executable. */
export interface ObsidianDiscoveryResult {
  /** Resolved executable path when discovery succeeded. */
  binary?: string;
  /** Description of the successful discovery source. */
  source?: "environment" | "default-path";
  /** Candidate paths inspected during discovery. */
  checked: string[];
}

/** Reviewed-version policy selected for repository-owned real-Obsidian E2E. */
export interface ObsidianE2EVersionPolicy {
  /** Exact version expected from the active renderer when selected in advance. */
  expectedVersion?: string;
  /** Whether an observed version outside the reviewed catalogue may run. */
  allowUnverifiedVersion: boolean;
}

const defaultCandidatesByPlatform: Partial<
  Record<NodeJS.Platform, readonly string[]>
> = {
  darwin: [
    "/Applications/Obsidian.app/Contents/MacOS/Obsidian",
    "/Applications/Obsidian.app/Contents/MacOS/obsidian",
  ],
  linux: [
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

interface ManagedObsidianTarget extends ObsidianVersionSelection {
  installDirectory: string;
}

function managedObsidianTarget(
  env: NodeJS.ProcessEnv,
): ManagedObsidianTarget | undefined {
  if (platform !== "linux") return undefined;
  const explicitBinary = env.OBSIDIAN_BINARY?.trim();
  const requestedVersion = env.E2E_OBSIDIAN_VERSION?.trim();
  if (explicitBinary && !requestedVersion) return undefined;
  const selection = selectObsidianVersion(
    requestedVersion,
    allowUnverifiedObsidianVersion(env),
  );
  const targetRoot = env.E2E_OBSIDIAN_DOWNLOAD_DIR?.trim() || "_testdata/obsidian";
  return {
    ...selection,
    installDirectory: obsidianAppImageInstallDirectory(
      targetRoot,
      selection.version,
      obsidianAppImageArchitecture(),
    ),
  };
}

/** Resolves the strict version policy used by repository-owned E2E runners. */
export function obsidianE2EVersionPolicy(
  env: NodeJS.ProcessEnv = process.env,
): ObsidianE2EVersionPolicy {
  const allowUnverifiedVersion = allowUnverifiedObsidianVersion(env);
  const requestedVersion = env.E2E_OBSIDIAN_VERSION?.trim();
  const explicitBinary = env.OBSIDIAN_BINARY?.trim();
  const expectedSelection =
    requestedVersion || !explicitBinary
      ? selectObsidianVersion(requestedVersion, allowUnverifiedVersion)
      : undefined;
  return {
    expectedVersion: expectedSelection?.version,
    allowUnverifiedVersion,
  };
}

function managedBinaryCandidates(target: ManagedObsidianTarget): string[] {
  return [
    join(target.installDirectory, "squashfs-root", "obsidian"),
    join(target.installDirectory, "squashfs-root", "AppRun"),
  ];
}

function managedCliCandidates(target: ManagedObsidianTarget): string[] {
  return [join(target.installDirectory, "squashfs-root", "obsidian-cli")];
}

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
  const explicitBinary = env.OBSIDIAN_BINARY?.trim();
  if (explicitBinary) return discover(explicitBinary, []);
  const managedTarget = managedObsidianTarget(env);
  if (managedTarget !== undefined)
    return discover(undefined, managedBinaryCandidates(managedTarget));
  return discover(undefined, defaultCandidatesByPlatform[platform] ?? []);
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
  const managedTarget = managedObsidianTarget(env);
  if (managedTarget !== undefined) {
    const probePrefix =
      managedTarget.support === "unverified"
        ? "E2E_OBSIDIAN_ALLOW_UNVERIFIED_VERSION=true "
        : "";
    throw new Error(
      [
        `Obsidian E2E target ${managedTarget.version} (${obsidianAppImageArchitecture()}, ${managedTarget.support}) is not installed.`,
        `Run: E2E_OBSIDIAN_VERSION=${managedTarget.version} ${probePrefix}npm run test:e2e:obsidian:install-appimage`,
        `Checked paths: ${result.checked.join(", ")}`,
      ].join("\n"),
    );
  }
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
  const explicitCli = env.OBSIDIAN_CLI?.trim();
  if (explicitCli) return discover(explicitCli, []);
  const managedTarget = managedObsidianTarget(env);
  if (managedTarget !== undefined)
    return discover(undefined, managedCliCandidates(managedTarget));
  return discover(undefined, defaultCliCandidatesByPlatform[platform] ?? []);
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
