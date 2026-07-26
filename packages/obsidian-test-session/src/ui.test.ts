import type { Page } from "playwright";
import { afterEach, describe, expect, it, vi } from "vitest";

const playwrightState = vi.hoisted(() => ({
  connectOverCDP: vi.fn(),
}));

vi.mock("playwright", () => ({
  chromium: {
    connectOverCDP: playwrightState.connectOverCDP,
  },
}));

import {
  enablePluginAndSave,
  ensurePluginLoaded,
  obsidianRemoteDebuggingPort,
  preseedLocalStorage,
  waitForObsidianPageVault,
  waitForObsidianPageUiIdle,
} from "./ui.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("obsidianRemoteDebuggingPort", () => {
  it("records an explicit valid port in the supplied environment", () => {
    const env = { E2E_OBSIDIAN_REMOTE_DEBUGGING_PORT: "32123" };
    expect(obsidianRemoteDebuggingPort(env)).toBe(32123);
    expect(env.E2E_OBSIDIAN_REMOTE_DEBUGGING_PORT).toBe("32123");
  });

  it.each(["0", "65536", "not-a-port", "1.5"])(
    "rejects the invalid port %s",
    (port) => {
      expect(() =>
        obsidianRemoteDebuggingPort({
          E2E_OBSIDIAN_REMOTE_DEBUGGING_PORT: port,
        }),
      ).toThrowError(RangeError);
    },
  );
});

describe("preseedLocalStorage", () => {
  it("writes every consumer-owned entry through the renderer before plug-in enablement", async () => {
    const storage = new Map<string, string>();
    const evaluate = vi.fn(
      async (
        operation: (entries: readonly (readonly [string, string])[]) => void,
        entries: readonly (readonly [string, string])[],
      ) => {
        vi.stubGlobal("localStorage", {
          setItem: (key: string, value: string) => storage.set(key, value),
        });
        try {
          operation(entries);
        } finally {
          vi.unstubAllGlobals();
        }
      },
    );
    const page = { evaluate } as unknown as Page;

    await preseedLocalStorage(page, {
      "example-state": "ready",
      "example-version": "7",
    });

    expect(storage).toEqual(
      new Map([
        ["example-state", "ready"],
        ["example-version", "7"],
      ]),
    );
  });
});

describe("ensurePluginLoaded", () => {
  async function runWithPluginManager(
    plugins: Record<string, unknown>,
    setEnable: ReturnType<typeof vi.fn>,
    loadPlugin: ReturnType<typeof vi.fn>,
  ): Promise<void> {
    const page = {
      evaluate: vi.fn(
        async (operation: (id: string) => Promise<void>, id: string) => {
          const target = globalThis as typeof globalThis & {
            app?: unknown;
          };
          const previousApp = target.app;
          target.app = { plugins: { plugins, setEnable, loadPlugin } };
          try {
            await operation(id);
          } finally {
            if (previousApp === undefined) delete target.app;
            else target.app = previousApp;
          }
        },
      ),
    } as unknown as Page;
    const close = vi.fn(async () => undefined);
    playwrightState.connectOverCDP.mockResolvedValue({
      contexts: () => [{ pages: () => [page] }],
      close,
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })));

    await ensurePluginLoaded(9222, "example-plugin");

    expect(close).toHaveBeenCalledOnce();
  }

  it("keeps an already loaded plug-in running", async () => {
    const setEnable = vi.fn(async () => undefined);
    const loadPlugin = vi.fn(async () => undefined);

    await runWithPluginManager(
      { "example-plugin": { starting: true } },
      setEnable,
      loadPlugin,
    );

    expect(setEnable).toHaveBeenCalledWith(true);
    expect(loadPlugin).not.toHaveBeenCalled();
  });

  it("loads an installed plug-in when it is not running", async () => {
    const setEnable = vi.fn(async () => undefined);
    const loadPlugin = vi.fn(async () => undefined);

    await runWithPluginManager({}, setEnable, loadPlugin);

    expect(setEnable).toHaveBeenCalledWith(true);
    expect(loadPlugin).toHaveBeenCalledOnce();
    expect(loadPlugin).toHaveBeenCalledWith("example-plugin");
  });
});

describe("enablePluginAndSave", () => {
  async function runWithPluginManager(
    plugins: Record<string, unknown>,
    setEnable: ReturnType<typeof vi.fn>,
    enableAndSave: ReturnType<typeof vi.fn>,
    saveConfig: ReturnType<typeof vi.fn>,
  ): Promise<void> {
    const page = {
      evaluate: vi.fn(
        async (operation: (id: string) => Promise<void>, id: string) => {
          const target = globalThis as typeof globalThis & {
            app?: unknown;
          };
          const previousApp = target.app;
          target.app = {
            plugins: {
              plugins,
              setEnable,
              enablePluginAndSave: enableAndSave,
              saveConfig,
            },
          };
          try {
            await operation(id);
          } finally {
            if (previousApp === undefined) delete target.app;
            else target.app = previousApp;
          }
        },
      ),
    } as unknown as Page;
    const close = vi.fn(async () => undefined);
    playwrightState.connectOverCDP.mockResolvedValue({
      contexts: () => [{ pages: () => [page] }],
      close,
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })));

    await enablePluginAndSave(9222, "example-plugin");

    expect(close).toHaveBeenCalledOnce();
  }

  it("enables community plug-ins before persistently loading the target", async () => {
    const setEnable = vi.fn(async () => undefined);
    const enableAndSave = vi.fn(async () => undefined);
    const saveConfig = vi.fn(async () => undefined);

    await runWithPluginManager({}, setEnable, enableAndSave, saveConfig);

    expect(setEnable).toHaveBeenCalledWith(true);
    expect(enableAndSave).toHaveBeenCalledWith("example-plugin");
    expect(saveConfig).toHaveBeenCalledOnce();
    expect(setEnable.mock.invocationCallOrder[0]).toBeLessThan(
      enableAndSave.mock.invocationCallOrder[0]!,
    );
    expect(enableAndSave.mock.invocationCallOrder[0]).toBeLessThan(
      saveConfig.mock.invocationCallOrder[0]!,
    );
  });

  it("rejects when the target loaded before its controlled start", async () => {
    const setEnable = vi.fn(async () => undefined);
    const enableAndSave = vi.fn(async () => undefined);
    const saveConfig = vi.fn(async () => undefined);

    await expect(
      runWithPluginManager(
        { "example-plugin": { starting: true } },
        setEnable,
        enableAndSave,
        saveConfig,
      ),
    ).rejects.toThrowError("loaded before its controlled start phase");
    expect(setEnable).not.toHaveBeenCalled();
    expect(enableAndSave).not.toHaveBeenCalled();
    expect(saveConfig).not.toHaveBeenCalled();
  });
});

describe("waitForObsidianPageUiIdle", () => {
  it("leaves the renderer unchanged when the start-up overlay becomes hidden", async () => {
    const waitFor = vi.fn().mockResolvedValue(undefined);
    const evaluateAll = vi.fn();
    const page = {
      locator: vi.fn(() => ({ waitFor, evaluateAll })),
    } as unknown as Page;

    await waitForObsidianPageUiIdle(page, 25);

    expect(waitFor).toHaveBeenCalledWith({ state: "hidden", timeout: 25 });
    expect(evaluateAll).not.toHaveBeenCalled();
  });

  it("removes only the stale start-up overlay after the wait expires", async () => {
    const remove = vi.fn();
    const waitFor = vi.fn().mockRejectedValue(new Error("timeout"));
    const evaluateAll = vi.fn(
      async (operation: (elements: Element[]) => void) => {
        operation([{ remove } as unknown as Element]);
      },
    );
    const page = {
      locator: vi.fn(() => ({ waitFor, evaluateAll })),
    } as unknown as Page;

    await waitForObsidianPageUiIdle(page, 25);

    expect(page.locator).toHaveBeenCalledWith(".progress-bar-container");
    expect(remove).toHaveBeenCalledOnce();
  });
});

describe("waitForObsidianPageVault", () => {
  it("requires the renderer vault path to match the isolated vault exactly", async () => {
    const waitForFunction = vi.fn().mockResolvedValue(undefined);
    const page = { waitForFunction } as unknown as Page;

    await waitForObsidianPageVault(page, "/tmp/isolated-vault", 250);

    expect(waitForFunction).toHaveBeenCalledOnce();
    expect(waitForFunction.mock.calls[0]?.[1]).toBe("/tmp/isolated-vault");
    expect(waitForFunction.mock.calls[0]?.[2]).toEqual({ timeout: 250 });
  });
});
