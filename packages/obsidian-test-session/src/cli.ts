import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { platform } from "node:process";

/** The captured result of one `obsidian-cli` process. */
export interface ObsidianCliResult {
  /** The process exit code, or `null` when the process ended by signal. */
  code: number | null;
  /** The terminating signal, or `null` after a normal exit. */
  signal: NodeJS.Signals | null;
  /** Captured standard output. */
  stdout: string;
  /** Captured standard error. */
  stderr: string;
}

function parseEvalJson(stdout: string): unknown {
  const marker = "=> ";
  const markerIndex = stdout.indexOf(marker);
  const text =
    markerIndex >= 0 ? stdout.slice(markerIndex + marker.length) : stdout;
  return JSON.parse(text.trim());
}

async function waitForObsidianCliSocket(
  env: NodeJS.ProcessEnv,
  timeoutMs = Number(
    env.E2E_OBSIDIAN_CLI_READY_TIMEOUT_MS ??
      process.env.E2E_OBSIDIAN_CLI_READY_TIMEOUT_MS ??
      30_000,
  ),
): Promise<void> {
  if (platform === "win32") return;
  const homePath = env.HOME?.trim() || homedir();
  const socketRoot =
    platform !== "darwin" && env.XDG_RUNTIME_DIR?.trim()
      ? env.XDG_RUNTIME_DIR
      : homePath;
  const socketPath = join(socketRoot, ".obsidian-cli.sock");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(socketPath)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for Obsidian CLI socket: ${socketPath}`);
}

/**
 * Runs `obsidian-cli` and captures its result.
 *
 * @param cliBinary - Absolute or executable path to `obsidian-cli`.
 * @param args - Command-line arguments.
 * @param env - Environment used to select the isolated Obsidian profile.
 * @param timeoutMs - Process timeout in milliseconds.
 * @returns The captured process result.
 */
export async function runObsidianCli(
  cliBinary: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
  timeoutMs = Number(process.env.E2E_OBSIDIAN_CLI_TIMEOUT_MS ?? 10_000),
): Promise<ObsidianCliResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(cliBinary, [...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(
        new Error(`Obsidian CLI timed out: ${cliBinary} ${args.join(" ")}`),
      );
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal, stdout, stderr });
    });
  });
}

/**
 * Delivers a vault-open URI through `obsidian-cli`.
 *
 * @param cliBinary - Absolute or executable path to `obsidian-cli`.
 * @param vaultPath - Filesystem path of the vault to open.
 * @param env - Environment selecting the isolated Obsidian profile.
 */
export async function openVaultWithObsidianCli(
  cliBinary: string,
  vaultPath: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  await waitForObsidianCliSocket(env);
  const result = await runObsidianCli(
    cliBinary,
    [`obsidian://open?path=${encodeURIComponent(vaultPath)}`],
    env,
  );
  if (result.code !== 0) {
    throw new Error(
      [
        `Failed to open Obsidian vault through CLI. code=${result.code}, signal=${result.signal}`,
        result.stdout ? `stdout:\n${result.stdout}` : undefined,
        result.stderr ? `stderr:\n${result.stderr}` : undefined,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

/**
 * Evaluates JavaScript through `obsidian-cli` and parses its JSON result.
 *
 * @param cliBinary - Absolute or executable path to `obsidian-cli`.
 * @param code - JavaScript expression whose printed result is JSON.
 * @param env - Environment selecting the isolated Obsidian profile.
 * @param timeoutMs - Optional process timeout in milliseconds.
 * @returns The parsed JSON value.
 */
export async function evalObsidianJson<T>(
  cliBinary: string,
  code: string,
  env: NodeJS.ProcessEnv = process.env,
  timeoutMs?: number,
): Promise<T> {
  const result = await runObsidianCli(
    cliBinary,
    ["eval", `code=${code}`],
    env,
    timeoutMs,
  );
  if (result.code !== 0) {
    throw new Error(
      [
        `Failed to evaluate Obsidian JavaScript through CLI. code=${result.code}, signal=${result.signal}`,
        result.stdout ? `stdout:\n${result.stdout}` : undefined,
        result.stderr ? `stderr:\n${result.stderr}` : undefined,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  try {
    return parseEvalJson(result.stdout) as T;
  } catch (error) {
    throw new Error(
      [
        `Failed to parse Obsidian CLI eval JSON. code=${result.code}, signal=${result.signal}`,
        error instanceof Error ? `parse error: ${error.message}` : undefined,
        result.stdout ? `stdout:\n${result.stdout}` : undefined,
        result.stderr ? `stderr:\n${result.stderr}` : undefined,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}
