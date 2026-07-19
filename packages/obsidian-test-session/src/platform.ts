import { tmpdir } from "node:os";
import { platform } from "node:process";

/** Selects a short temporary root for Obsidian's platform-specific IPC files. */
export function obsidianTemporaryRoot(
  hostPlatform: NodeJS.Platform = platform,
  systemTemporaryRoot = tmpdir(),
): string {
  return hostPlatform === "darwin" ? "/tmp" : systemTemporaryRoot;
}

/** Returns test-process launch arguments required by the current host platform. */
export function obsidianPlatformLaunchArguments(
  hostPlatform: NodeJS.Platform = platform,
): string[] {
  return hostPlatform === "darwin" ? ["--use-mock-keychain"] : [];
}
