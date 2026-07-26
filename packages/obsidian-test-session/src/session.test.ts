import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  order: [] as string[],
  entries: undefined as Readonly<Record<string, string>> | undefined,
  installOptions: undefined as
    | {
        enableOnStartup?: boolean;
      }
    | undefined,
  processStop: vi.fn(async () => undefined),
  reloadPlugin: vi.fn(async () => {
    state.order.push("enable");
  }),
  ensurePluginLoaded: vi.fn(async () => {
    state.order.push("ensure-loaded");
  }),
  enablePluginAndSave: vi.fn(async () => {
    state.order.push("enable-and-save");
  }),
}));

vi.mock("./plugin-installer.js", () => ({
  installBuiltPlugin: vi.fn(async (_vaultPath, options) => {
    state.order.push("install");
    state.installOptions = options;
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
  enableAndReloadPlugin: state.reloadPlugin,
  enablePluginAndSave: state.enablePluginAndSave,
  ensurePluginLoaded: state.ensurePluginLoaded,
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
  it("runs controlled lifecycle hooks around the plug-in's first load", async () => {
    state.order.length = 0;
    state.installOptions = undefined;

    await startObsidianPluginSession({
      binary: "/bin/obsidian",
      cliBinary: "/bin/obsidian-cli",
      pluginId: "example-plugin",
      artifactRoot: "/artefacts",
      pluginStartup: "controlled",
      lifecycle: {
        beforeLaunch: async () => {
          state.order.push("before-launch");
        },
        afterLaunch: async () => {
          state.order.push("after-launch");
        },
        beforePluginStart: async () => {
          state.order.push("before-plugin-start");
        },
        afterPluginLoad: async () => {
          state.order.push("after-plugin-load");
        },
        afterReady: async () => {
          state.order.push("after-ready");
        },
      },
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

    expect(state.installOptions?.enableOnStartup).toBe(false);
    expect(state.order).toEqual([
      "install",
      "before-launch",
      "launch",
      "after-launch",
      "trust-state",
      "open-vault",
      "trust-prompt",
      "catalogue",
      "before-plugin-start",
      "enable-and-save",
      "after-plugin-load",
      "ready",
      "idle",
      "after-ready",
    ]);
  });

  it(
    "rejects natural start-up when local storage must be written before the first load",
    async () => {
      state.order.length = 0;

      await expect(
        startObsidianPluginSession({
          binary: "/bin/obsidian",
          cliBinary: "/bin/obsidian-cli",
          pluginId: "example-plugin",
          artifactRoot: "/artefacts",
          pluginStartup: "natural",
          localStorageEntries: {
            "example-plugin-device-schema": "3",
          },
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
        }),
      ).rejects.toThrowError(
        "Natural plug-in start-up cannot guarantee localStorageEntries",
      );
      expect(state.order).toEqual([]);
    },
  );

  it("stops the launched process when a running lifecycle hook fails", async () => {
    state.order.length = 0;
    state.processStop.mockClear();

    await expect(
      startObsidianPluginSession({
        binary: "/bin/obsidian",
        cliBinary: "/bin/obsidian-cli",
        pluginId: "example-plugin",
        artifactRoot: "/artefacts",
        lifecycle: {
          afterLaunch: async () => {
            throw new Error("fixture failed");
          },
        },
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
      }),
    ).rejects.toThrowError(
      "Obsidian session lifecycle hook 'afterLaunch' failed",
    );
    expect(state.processStop).toHaveBeenCalledOnce();
  });

  it("seeds exact device-local state before opening the Vault or enabling the plug-in", async () => {
    state.order.length = 0;
    state.entries = undefined;
    state.installOptions = undefined;
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
    expect(state.installOptions?.enableOnStartup).toBe(false);
    expect(state.order).toEqual([
      "install",
      "launch",
      "trust-state",
      "renderer",
      "local-storage",
      "open-vault",
      "trust-prompt",
      "catalogue",
      "enable-and-save",
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
      pluginStartup: "natural",
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

  it("keeps an automatically loaded plug-in running during session start-up", async () => {
    state.reloadPlugin.mockClear();
    state.ensurePluginLoaded.mockClear();
    state.installOptions = undefined;

    await startObsidianPluginSession({
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

    expect(state.reloadPlugin).not.toHaveBeenCalled();
    expect(state.ensurePluginLoaded).toHaveBeenCalledOnce();
    expect(state.installOptions?.enableOnStartup).toBe(true);
  });
});
