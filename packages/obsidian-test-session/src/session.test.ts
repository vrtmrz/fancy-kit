import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  order: [] as string[],
  entries: undefined as Readonly<Record<string, string>> | undefined,
  processStop: vi.fn(async () => undefined),
}));

vi.mock("./plugin-installer.js", () => ({
  installBuiltPlugin: vi.fn(async () => {
    state.order.push("install");
    return { pluginDirectory: "/vault/.obsidian/plugins/example-plugin" };
  }),
}));

vi.mock("./launch.js", () => ({
  launchObsidian: vi.fn(async () => {
    state.order.push("launch");
    return {
      process: { exitCode: null, signalCode: null },
      output: () => ({ stdout: "", stderr: "" }),
      stop: state.processStop,
    };
  }),
}));

vi.mock("./cli.js", () => ({
  openVaultWithObsidianCli: vi.fn(async () => {
    state.order.push("open-vault");
  }),
}));

vi.mock("./renderer-lifecycle.js", () => ({
  closeObsidianRendererPages: vi.fn(async () => {
    state.order.push("close-renderer");
  }),
}));

vi.mock("./ui.js", () => ({
  obsidianRemoteDebuggingPort: vi.fn(() => 9222),
  preseedTrustedVaultState: vi.fn(async () => {
    state.order.push("trust-state");
  }),
  withObsidianPage: vi.fn(async (_port, operation) => {
    state.order.push("renderer");
    return await operation({ evaluate: vi.fn() });
  }),
  preseedLocalStorage: vi.fn(async (_page, entries) => {
    state.order.push("local-storage");
    state.entries = entries;
  }),
  trustVaultIfPrompted: vi.fn(async () => {
    state.order.push("trust-prompt");
  }),
  waitForPluginCatalogue: vi.fn(async () => {
    state.order.push("catalogue");
  }),
  enableAndReloadPlugin: vi.fn(async () => {
    state.order.push("enable");
  }),
  waitForPluginReady: vi.fn(async () => {
    state.order.push("ready");
    return { pluginId: "example-plugin", enabled: true };
  }),
  waitForObsidianUiIdle: vi.fn(async () => {
    state.order.push("idle");
  }),
  waitForObsidianVault: vi.fn(),
}));

import { startObsidianPluginSession } from "./session.js";

describe("startObsidianPluginSession", () => {
  it("seeds exact device-local state before opening the Vault or enabling the plug-in", async () => {
    state.order.length = 0;
    state.entries = undefined;
    const localStorageEntries = {
      "example-plugin-device-schema": "3",
    } as const;

    await startObsidianPluginSession({
      binary: "/bin/obsidian",
      cliBinary: "/bin/obsidian-cli",
      pluginId: "example-plugin",
      artifactRoot: "/artefacts",
      localStorageEntries,
      vault: {
        id: "vault-id",
        path: "/vault",
        homePath: "/profile/home",
        xdgConfigPath: "/profile/config",
        xdgCachePath: "/profile/cache",
        xdgDataPath: "/profile/data",
        userDataPath: "/profile/user-data",
        processMarker: "example-marker",
      } as never,
    });

    expect(state.entries).toBe(localStorageEntries);
    expect(state.order).toEqual([
      "install",
      "launch",
      "trust-state",
      "renderer",
      "local-storage",
      "open-vault",
      "trust-prompt",
      "catalogue",
      "enable",
      "ready",
      "idle",
    ]);
  });

  it("closes the renderer before terminating the process so profile state can be persisted", async () => {
    state.order.length = 0;
    state.processStop.mockClear();

    const session = await startObsidianPluginSession({
      binary: "/bin/obsidian",
      cliBinary: "/bin/obsidian-cli",
      pluginId: "example-plugin",
      artifactRoot: "/artefacts",
      vault: {
        id: "vault-id",
        path: "/vault",
        homePath: "/profile/home",
        xdgConfigPath: "/profile/config",
        xdgCachePath: "/profile/cache",
        xdgDataPath: "/profile/data",
        userDataPath: "/profile/user-data",
        processMarker: "example-marker",
      } as never,
    });

    state.order.length = 0;
    await session.app.stop();
    await session.app.stop();

    expect(state.order).toEqual(["close-renderer"]);
    expect(state.processStop).toHaveBeenCalledOnce();
  });
});
