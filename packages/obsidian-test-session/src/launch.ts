import { execFile, spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { platform } from "node:process";
import { promisify } from "node:util";
import { obsidianPlatformLaunchArguments } from "./platform.js";
import { registerProcessCleanup } from "./process-lifecycle.js";

/** Captured output from an Obsidian process. */
export interface ObsidianProcessOutput {
  /** Captured standard output. */
  stdout: string;
  /** Captured standard error. */
  stderr: string;
}

/** A launched Obsidian process and its lifecycle controls. */
export interface ObsidianProcess {
  /** Direct child process created by the runner. */
  process: ChildProcess;
  /** Returns captured standard output and standard error. */
  output: () => ObsidianProcessOutput;
  /** Stops the process group and descendant processes. */
  stop: () => Promise<void>;
}

/** Options for launching an isolated Obsidian process. */
export interface LaunchObsidianOptions {
  /** Obsidian application executable. */
  binary: string;
  /** Vault path delivered in the initial Obsidian URI. */
  vaultPath: string;
  /** Optional isolated `HOME` directory. */
  homePath?: string;
  /** Optional isolated `XDG_CONFIG_HOME` directory. */
  xdgConfigPath?: string;
  /** Optional isolated `XDG_CACHE_HOME` directory. */
  xdgCachePath?: string;
  /** Optional isolated `XDG_DATA_HOME` directory. */
  xdgDataPath?: string;
  /** Optional Electron user-data directory. */
  userDataPath?: string;
  /** Optional Electron remote-debugging port. */
  remoteDebuggingPort?: number;
  /** Environment inherited by the launched process. */
  env?: NodeJS.ProcessEnv;
  /** Time that the process must remain alive before launch succeeds. */
  startupGraceMs?: number;
  /** Substring used to find stale E2E processes before launch. */
  staleProcessPattern?: string;
}

const execFileAsync = promisify(execFile);

function splitArgs(args: string): string[] {
  return args.split(" ").filter((arg) => arg.length > 0);
}

function launchArgs(options: LaunchObsidianOptions): string[] {
  const explicitArgs =
    options.env?.E2E_OBSIDIAN_ARGS ?? process.env.E2E_OBSIDIAN_ARGS;
  if (explicitArgs) return splitArgs(explicitArgs);
  const useUserDataDir =
    options.env?.E2E_OBSIDIAN_USE_USER_DATA_DIR ??
    process.env.E2E_OBSIDIAN_USE_USER_DATA_DIR;
  return [
    "--no-sandbox",
    "--disable-gpu",
    "--disable-software-rasterizer",
    ...obsidianPlatformLaunchArguments(),
    ...(useUserDataDir !== "false" && options.userDataPath
      ? [`--user-data-dir=${options.userDataPath}`]
      : []),
    ...(options.remoteDebuggingPort !== undefined
      ? [`--remote-debugging-port=${options.remoteDebuggingPort}`]
      : []),
    `obsidian://open?path=${encodeURIComponent(options.vaultPath)}`,
  ];
}

function shouldUseXvfb(env: NodeJS.ProcessEnv): boolean {
  if (env.E2E_OBSIDIAN_USE_XVFB === "false") return false;
  if (env.DISPLAY || env.WAYLAND_DISPLAY) return false;
  return platform === "linux" && existsSync("/usr/bin/xvfb-run");
}

async function listChildPids(pid: number): Promise<number[]> {
  if (platform === "win32") return [];
  const { stdout } = await execFileAsync("pgrep", ["-P", String(pid)]).catch(
    () => ({ stdout: "" }),
  );
  const directChildren = stdout
    .split("\n")
    .map((line) => Number(line.trim()))
    .filter((childPid) => Number.isInteger(childPid) && childPid > 0);
  const descendants = await Promise.all(
    directChildren.map((childPid) => listChildPids(childPid)),
  );
  return [...directChildren, ...descendants.flat()];
}

async function killPids(
  pids: readonly number[],
  signal: NodeJS.Signals,
): Promise<void> {
  for (const pid of pids) {
    if (pid === process.pid) continue;
    try {
      process.kill(pid, signal);
    } catch {
      // The process may have exited between discovery and signalling.
    }
  }
}

async function waitForExit(
  exitPromise: Promise<unknown>,
  timeoutMs: number,
): Promise<"exited" | "timeout"> {
  const stopTimer = new Promise<"timeout">((resolve) =>
    setTimeout(() => resolve("timeout"), timeoutMs),
  );
  return await Promise.race([
    exitPromise.then(() => "exited" as const),
    stopTimer,
  ]);
}

/**
 * Stops stale Obsidian E2E processes whose command line contains a consumer-specific marker.
 *
 * @param processPattern - Non-empty substring identifying the isolated user-data path family.
 * @param env - Environment controlling whether stale-process cleanup is enabled.
 */
export async function cleanupStaleObsidianE2EProcesses(
  processPattern: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (
    env.E2E_OBSIDIAN_CLEANUP_STALE_PROCESSES === "false" ||
    platform === "win32"
  )
    return;
  if (processPattern.trim().length < 8) {
    throw new Error(
      "The stale-process pattern must contain at least eight characters",
    );
  }
  const { stdout } = await execFileAsync("pgrep", ["-f", processPattern]).catch(
    () => ({ stdout: "" }),
  );
  const pids = stdout
    .split("\n")
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
  if (pids.length === 0) return;
  await killPids(pids, "SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  await killPids(pids, "SIGKILL");
}

/**
 * Launches Obsidian with isolated profile state and captures its process tree.
 *
 * @param options - Application, vault, environment, and lifecycle options.
 * @returns The launched process and stop operation.
 */
export async function launchObsidian(
  options: LaunchObsidianOptions,
): Promise<ObsidianProcess> {
  const env = { ...process.env, ...options.env };
  if (options.staleProcessPattern)
    await cleanupStaleObsidianE2EProcesses(options.staleProcessPattern, env);
  const startupGraceMs = options.startupGraceMs ?? 1_000;
  const args = launchArgs(options);
  const useXvfb = shouldUseXvfb(env);
  const command = useXvfb ? "/usr/bin/xvfb-run" : options.binary;
  const commandArgs = useXvfb ? ["-a", options.binary, ...args] : args;
  const child = spawn(command, commandArgs, {
    cwd: dirname(options.binary),
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...env,
      ...(options.homePath ? { HOME: options.homePath } : {}),
      ...(options.xdgConfigPath
        ? { XDG_CONFIG_HOME: options.xdgConfigPath }
        : {}),
      ...(options.xdgCachePath ? { XDG_CACHE_HOME: options.xdgCachePath } : {}),
      ...(options.xdgDataPath ? { XDG_DATA_HOME: options.xdgDataPath } : {}),
      OBSIDIAN_DISABLE_GPU: env.OBSIDIAN_DISABLE_GPU ?? "1",
    },
  });

  let stderr = "";
  let stdout = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  child.stdout?.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
  });

  const exitPromise = once(child, "exit").then(([code, signal]) => ({
    code,
    signal,
  }));
  const stop = registerProcessCleanup(
    `Obsidian process group ${child.pid ?? "with an unavailable PID"}`,
    async () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const descendantPids = child.pid ? await listChildPids(child.pid) : [];
      if (child.pid) {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {
          child.kill("SIGTERM");
        }
      } else {
        child.kill("SIGTERM");
      }
      await killPids(descendantPids.reverse(), "SIGTERM");
      const stopResult = await waitForExit(exitPromise, 5_000);
      if (stopResult === "timeout") {
        if (child.pid) {
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {
            child.kill("SIGKILL");
          }
        } else {
          child.kill("SIGKILL");
        }
        await killPids(descendantPids, "SIGKILL");
        await exitPromise;
      }
    },
  );
  const timer = new Promise<"timeout">((resolve) =>
    setTimeout(() => resolve("timeout"), startupGraceMs),
  );
  const firstResult = await Promise.race([exitPromise, timer]);
  if (firstResult !== "timeout") {
    await stop();
    throw new Error(
      [
        `Obsidian exited before the start-up grace period. code=${firstResult.code}, signal=${firstResult.signal}`,
        stdout ? `stdout:\n${stdout}` : undefined,
        stderr ? `stderr:\n${stderr}` : undefined,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return {
    process: child,
    output: () => ({ stdout, stderr }),
    stop,
  };
}
