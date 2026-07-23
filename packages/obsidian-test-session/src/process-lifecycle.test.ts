import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
import { ProcessSignalCleanup } from "./process-lifecycle.js";

interface FixtureState {
  runnerPid: number;
  processPid: number;
  vaultPath: string;
  statePath: string;
}

interface FixtureOutput {
  stdout: string;
  stderr: string;
}

const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli");
const fixturePath = fileURLToPath(
  new URL("../test/fixtures/signal-cleanup-runner.ts", import.meta.url),
);

async function waitForFixtureState(
  readyPath: string,
  child: ChildProcess,
  output: FixtureOutput,
): Promise<FixtureState> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      return JSON.parse(await readFile(readyPath, "utf8")) as FixtureState;
    } catch {
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(
          [
            `Signal cleanup fixture exited before it became ready: code=${child.exitCode}, signal=${child.signalCode}`,
            output.stdout ? `stdout:\n${output.stdout}` : undefined,
            output.stderr ? `stderr:\n${output.stderr}` : undefined,
          ]
            .filter(Boolean)
            .join("\n"),
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw new Error("Signal cleanup fixture did not become ready");
}

function captureFixtureOutput(child: ChildProcess): FixtureOutput {
  const output: FixtureOutput = { stdout: "", stderr: "" };
  child.stdout?.on("data", (chunk: Buffer) => {
    output.stdout += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    output.stderr += chunk.toString();
  });
  return output;
}

async function waitForProcessExit(pid: number): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(
    `Detached process ${pid} remained after the test runner received SIGTERM`,
  );
}

function terminateProcessGroup(pid: number): void {
  if (!Number.isInteger(pid) || pid <= 0) return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // The process may already have exited.
    }
  }
}

async function runSignalCleanupFixture(
  keepVault: boolean,
  verifyTemporaryState: (state: FixtureState) => void,
): Promise<void> {
  const temporaryRoot = await mkdtemp(
    join(
      tmpdir(),
      keepVault
        ? "obsidian-signal-cleanup-keep-test-"
        : "obsidian-signal-cleanup-test-",
    ),
  );
  const readyPath = join(temporaryRoot, "ready.json");
  const child = spawn(process.execPath, [tsxCli, fixturePath], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      E2E_OBSIDIAN_KEEP_VAULT: keepVault ? "true" : "false",
      SIGNAL_CLEANUP_TEMPORARY_ROOT: temporaryRoot,
      SIGNAL_CLEANUP_READY_PATH: readyPath,
    },
  });
  const output = captureFixtureOutput(child);
  let state: FixtureState | undefined;

  try {
    state = await waitForFixtureState(readyPath, child, output);
    const exit = new Promise<{
      code: number | null;
      signal: NodeJS.Signals | null;
    }>((resolve) => {
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });

    child.kill("SIGTERM");
    expect(await exit).toEqual({ code: 143, signal: null });

    await waitForProcessExit(state.processPid);
    verifyTemporaryState(state);
  } finally {
    if (state) terminateProcessGroup(state.processPid);
    if (child.exitCode === null && child.signalCode === null) {
      terminateProcessGroup(child.pid ?? 0);
    }
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

class TestSignalTarget {
  readonly listeners = new Map<NodeJS.Signals, Set<() => void>>();

  on(signal: NodeJS.Signals, listener: () => void): void {
    const listeners = this.listeners.get(signal) ?? new Set();
    listeners.add(listener);
    this.listeners.set(signal, listeners);
  }

  off(signal: NodeJS.Signals, listener: () => void): void {
    this.listeners.get(signal)?.delete(listener);
  }
}

describe("process signal cleanup policy", () => {
  it("installs signal handlers lazily and removes them after ordinary cleanup", async () => {
    const signalTarget = new TestSignalTarget();
    const lifecycle = new ProcessSignalCleanup({ signalTarget });
    expect(signalTarget.listeners.size).toBe(0);

    const dispose = lifecycle.register(
      "temporary",
      "temporary test state",
      vi.fn(async () => undefined),
    );
    expect([...signalTarget.listeners.keys()]).toEqual([
      "SIGHUP",
      "SIGINT",
      "SIGTERM",
    ]);

    await dispose();
    expect(
      [...signalTarget.listeners.values()].every(
        (listeners) => listeners.size === 0,
      ),
    ).toBe(true);
  });

  it("stops every process before disposing temporary state", async () => {
    const order: string[] = [];
    const exit = vi.fn();
    const lifecycle = new ProcessSignalCleanup({
      signalTarget: new TestSignalTarget(),
      exit,
    });
    lifecycle.register("temporary", "temporary test state", async () => {
      order.push("temporary");
    });
    lifecycle.register("process", "test process", async () => {
      order.push("process");
    });

    await lifecycle.handleSignal("SIGTERM");

    expect(order).toEqual(["process", "temporary"]);
    expect(exit).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(143);
  });

  it("runs concurrent requests for the same cleanup only once", async () => {
    const cleanup = vi.fn(async () => undefined);
    const lifecycle = new ProcessSignalCleanup({
      signalTarget: new TestSignalTarget(),
    });
    const run = lifecycle.register("process", "test process", cleanup);

    await Promise.all([run(), run()]);

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("preserves temporary state when a process cannot be stopped", async () => {
    const dispose = vi.fn(async () => undefined);
    const report = vi.fn();
    const exit = vi.fn();
    const lifecycle = new ProcessSignalCleanup({
      signalTarget: new TestSignalTarget(),
      exit,
      report,
    });
    lifecycle.register("temporary", "temporary test state", dispose);
    lifecycle.register("process", "test process", async () => {
      throw new Error("stop failed");
    });

    await lifecycle.handleSignal("SIGTERM");

    expect(dispose).not.toHaveBeenCalled();
    expect(report).toHaveBeenCalledWith(
      "Could not stop test process: stop failed",
    );
    expect(report).toHaveBeenCalledWith(
      "Keeping temporary test state because an Obsidian process could not be stopped.",
    );
    expect(exit).toHaveBeenCalledWith(143);
  });

  it.each([
    ["SIGHUP", 129],
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ] as const)(
    "retains the conventional exit code for %s",
    async (signal, code) => {
      const exit = vi.fn();
      const lifecycle = new ProcessSignalCleanup({
        signalTarget: new TestSignalTarget(),
        exit,
      });

      await lifecycle.handleSignal(signal);

      expect(exit).toHaveBeenCalledWith(code);
    },
  );
});

describe.skipIf(process.platform === "win32")("process signal cleanup", () => {
  it("stops the detached process before removing the package-owned Vault and profile", async () => {
    await runSignalCleanupFixture(false, (state) => {
      expect(existsSync(state.vaultPath)).toBe(false);
      expect(existsSync(state.statePath)).toBe(false);
    });
  }, 15_000);

  it("stops the detached process while preserving the Vault and profile requested for debugging", async () => {
    await runSignalCleanupFixture(true, (state) => {
      expect(existsSync(state.vaultPath)).toBe(true);
      expect(existsSync(state.statePath)).toBe(true);
    });
  }, 15_000);
});
