import { openVaultWithObsidianCli } from "./cli.js";
import { launchObsidian, type ObsidianProcess } from "./launch.js";
import {
  installBuiltPlugin,
  type PluginInstallResult,
} from "./plugin-installer.js";
import {
  enablePluginAndSave,
  ensurePluginLoaded,
  obsidianRemoteDebuggingPort,
  preseedLocalStorage,
  preseedTrustedVaultState,
  trustVaultIfPrompted,
  waitForObsidianVault,
  waitForObsidianUiIdle,
  waitForPluginCatalogue,
  waitForPluginReady,
  withObsidianPage,
  type PluginReadiness,
} from "./ui.js";
import { closeObsidianRendererPages } from "./renderer-lifecycle.js";
import type { TemporaryVault } from "./vault.js";

/** How the selected plug-in is started in a real-Obsidian session. */
export type ObsidianPluginStartupMode = "natural" | "controlled";

/** Context available before the Obsidian process is launched. */
export interface ObsidianPluginSessionLifecycleContext {
  /** Prepared isolated temporary Vault. */
  readonly vault: TemporaryVault;
  /** Installed plug-in identifier. */
  readonly pluginId: string;
  /** Installed plug-in artefact details. */
  readonly install: PluginInstallResult;
  /** Environment selecting the isolated profile for `obsidian-cli`. */
  readonly cliEnv: NodeJS.ProcessEnv;
  /** Electron remote-debugging port reserved for the session. */
  readonly remoteDebuggingPort: number;
  /** Selected plug-in start mode. */
  readonly pluginStartup: ObsidianPluginStartupMode;
}

/** Context available after the Obsidian process has been launched. */
export interface RunningObsidianPluginSessionLifecycleContext
  extends ObsidianPluginSessionLifecycleContext {
  /** Launched Obsidian process. Hook callbacks do not own its disposal. */
  readonly app: ObsidianProcess;
}

/** Context available after generic plug-in readiness has completed. */
export interface ReadyObsidianPluginSessionLifecycleContext
  extends RunningObsidianPluginSessionLifecycleContext {
  /** Renderer-observed plug-in readiness details. */
  readonly readiness: PluginReadiness;
}

/** Instance-scoped callbacks around stable session bootstrap phases. */
export interface ObsidianPluginSessionLifecycle {
  /**
   * Runs after artefact installation and environment preparation, immediately
   * before Obsidian is launched.
   */
  beforeLaunch?: (
    context: ObsidianPluginSessionLifecycleContext,
  ) => void | Promise<void>;
  /**
   * Runs after the Obsidian process survives its start-up grace period. The
   * renderer and Vault are not yet guaranteed to be ready.
   */
  afterLaunch?: (
    context: RunningObsidianPluginSessionLifecycleContext,
  ) => void | Promise<void>;
  /**
   * Runs after the exact Vault and plug-in catalogue are ready, while the
   * target plug-in remains unloaded. Supplying this callback selects
   * controlled start-up unless a mode is explicitly supplied.
   */
  beforePluginStart?: (
    context: RunningObsidianPluginSessionLifecycleContext,
  ) => void | Promise<void>;
  /**
   * Runs after the selected plug-in has been loaded, or after natural start-up
   * has confirmed that it is already running.
   */
  afterPluginLoad?: (
    context: RunningObsidianPluginSessionLifecycleContext,
  ) => void | Promise<void>;
  /**
   * Runs after generic plug-in readiness and optional start-up-overlay
   * handling have completed.
   */
  afterReady?: (
    context: ReadyObsidianPluginSessionLifecycleContext,
  ) => void | Promise<void>;
}

/** A ready real-Obsidian plug-in session. */
export interface ObsidianPluginSession {
  /** Launched Obsidian process. */
  app: ObsidianProcess;
  /** Environment selecting the session's isolated profile for `obsidian-cli`. */
  cliEnv: NodeJS.ProcessEnv;
  /** Installed plug-in artefact details. */
  install: PluginInstallResult;
  /** Renderer-observed plug-in readiness details. */
  readiness: PluginReadiness;
  /** Loaded plug-in identifier. */
  pluginId: string;
  /** Electron remote-debugging port. */
  remoteDebuggingPort: number;
}

/** Options for starting a real-Obsidian plug-in session. */
export interface StartObsidianPluginSessionOptions {
  /** Obsidian application executable. */
  binary: string;
  /** `obsidian-cli` executable used only to deliver the vault-open URI during bootstrap. */
  cliBinary: string;
  /** Prepared isolated temporary vault. */
  vault: TemporaryVault;
  /** Plug-in identifier to install and load. */
  pluginId: string;
  /** Directory containing built plug-in artefacts. */
  artifactRoot: string;
  /** Optional plug-in data written before the plug-in is loaded. */
  pluginData?: unknown;
  /** Exact values written to isolated renderer local storage before the plug-in's first load. */
  localStorageEntries?: Readonly<Record<string, string>>;
  /**
   * How the selected plug-in starts. `natural` permits Obsidian's normal
   * start-up loading. `controlled` keeps the plug-in unloaded until the
   * session starts it once. By default, `localStorageEntries` or a
   * `beforePluginStart` callback selects `controlled`; otherwise `natural` is
   * used.
   */
  pluginStartup?: ObsidianPluginStartupMode;
  /** Instance-scoped callbacks around stable session bootstrap phases. */
  lifecycle?: ObsidianPluginSessionLifecycle;
  /** Optional process environment overrides. */
  env?: NodeJS.ProcessEnv;
  /** Time that Obsidian must remain alive before launch succeeds. */
  startupGraceMs?: number;
  /** Whether to normalise a stale start-up overlay after readiness. Defaults to `true`. */
  waitForUiIdle?: boolean;
}

function resolvePluginStartup(
  options: StartObsidianPluginSessionOptions,
): ObsidianPluginStartupMode {
  const requiresControlledStart =
    options.localStorageEntries !== undefined ||
    options.lifecycle?.beforePluginStart !== undefined;
  if (options.pluginStartup === "natural" && requiresControlledStart)
    throw new Error(
      "Natural plug-in start-up cannot guarantee localStorageEntries or beforePluginStart before the first load",
    );
  return (
    options.pluginStartup ??
    (requiresControlledStart ? "controlled" : "natural")
  );
}

async function runLifecycleHook<Context>(
  name: keyof ObsidianPluginSessionLifecycle,
  hook: ((context: Context) => void | Promise<void>) | undefined,
  context: Context,
): Promise<void> {
  if (hook === undefined) return;
  try {
    await hook(context);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Obsidian session lifecycle hook '${name}' failed: ${detail}`,
      {
        cause: error,
      },
    );
  }
}

function withRendererAwareStop(
  app: ObsidianProcess,
  remoteDebuggingPort: number,
): ObsidianProcess {
  let stopping: Promise<void> | undefined;
  return {
    process: app.process,
    output: app.output,
    stop: async () => {
      stopping ??= (async () => {
        if (app.process.exitCode === null && app.process.signalCode === null) {
          await closeObsidianRendererPages(remoteDebuggingPort).catch(
            () => undefined,
          );
        }
        await app.stop();
      })();
      await stopping;
    },
  };
}

/**
 * Installs and starts a plug-in in an isolated real-Obsidian session.
 *
 * @param options - Application, vault, plug-in, and lifecycle options.
 * @returns A loaded plug-in session. The caller owns process and vault disposal.
 */
export async function startObsidianPluginSession(
  options: StartObsidianPluginSessionOptions,
): Promise<ObsidianPluginSession> {
  const pluginStartup = resolvePluginStartup(options);
  const install = await installBuiltPlugin(options.vault.path, {
    pluginId: options.pluginId,
    artifactRoot: options.artifactRoot,
    pluginData: options.pluginData,
    enableOnStartup: pluginStartup === "natural",
  });
  const baseEnv = { ...process.env, ...options.env };
  const remoteDebuggingPort = obsidianRemoteDebuggingPort(baseEnv);
  const cliEnv = {
    ...baseEnv,
    HOME: options.vault.homePath,
    XDG_CONFIG_HOME: options.vault.xdgConfigPath,
    XDG_CACHE_HOME: options.vault.xdgCachePath,
    XDG_DATA_HOME: options.vault.xdgDataPath,
  };
  const lifecycleContext: ObsidianPluginSessionLifecycleContext = {
    vault: options.vault,
    pluginId: options.pluginId,
    install,
    cliEnv,
    remoteDebuggingPort,
    pluginStartup,
  };
  await runLifecycleHook(
    "beforeLaunch",
    options.lifecycle?.beforeLaunch,
    lifecycleContext,
  );
  const app = await launchObsidian({
    binary: options.binary,
    vaultPath: options.vault.path,
    homePath: options.vault.homePath,
    xdgConfigPath: options.vault.xdgConfigPath,
    xdgCachePath: options.vault.xdgCachePath,
    xdgDataPath: options.vault.xdgDataPath,
    userDataPath: options.vault.userDataPath,
    remoteDebuggingPort,
    env: cliEnv,
    startupGraceMs: options.startupGraceMs,
    staleProcessPattern: options.vault.processMarker,
  });

  try {
    const runningLifecycleContext: RunningObsidianPluginSessionLifecycleContext =
      {
        ...lifecycleContext,
        app,
      };
    await runLifecycleHook(
      "afterLaunch",
      options.lifecycle?.afterLaunch,
      runningLifecycleContext,
    );
    await preseedTrustedVaultState(remoteDebuggingPort, options.vault.id);
    if (options.localStorageEntries !== undefined) {
      await withObsidianPage(remoteDebuggingPort, async (page) => {
        await preseedLocalStorage(page, options.localStorageEntries ?? {});
      });
    }
    try {
      await openVaultWithObsidianCli(
        options.cliBinary,
        options.vault.path,
        cliEnv,
      );
    } catch (cliError) {
      try {
        await waitForObsidianVault(
          remoteDebuggingPort,
          options.vault.path,
          Number(baseEnv.E2E_OBSIDIAN_VAULT_TIMEOUT_MS ?? 10_000),
        );
      } catch (vaultError) {
        throw new Error(
          [
            cliError instanceof Error ? cliError.message : String(cliError),
            vaultError instanceof Error
              ? vaultError.message
              : String(vaultError),
          ].join("\n"),
        );
      }
    }
    await trustVaultIfPrompted(remoteDebuggingPort);
    await waitForPluginCatalogue(remoteDebuggingPort, options.pluginId);
    await runLifecycleHook(
      "beforePluginStart",
      options.lifecycle?.beforePluginStart,
      runningLifecycleContext,
    );
    if (pluginStartup === "controlled")
      await enablePluginAndSave(remoteDebuggingPort, options.pluginId);
    else await ensurePluginLoaded(remoteDebuggingPort, options.pluginId);
    await runLifecycleHook(
      "afterPluginLoad",
      options.lifecycle?.afterPluginLoad,
      runningLifecycleContext,
    );
    const readiness = await waitForPluginReady(
      remoteDebuggingPort,
      options.pluginId,
    );
    if (options.waitForUiIdle !== false)
      await waitForObsidianUiIdle(remoteDebuggingPort);
    await runLifecycleHook(
      "afterReady",
      options.lifecycle?.afterReady,
      {
        ...runningLifecycleContext,
        readiness,
      },
    );
    return {
      app: withRendererAwareStop(app, remoteDebuggingPort),
      cliEnv,
      install,
      readiness,
      pluginId: options.pluginId,
      remoteDebuggingPort,
    };
  } catch (error) {
    const output = app.output();
    await app.stop();
    throw new Error(
      [
        error instanceof Error ? error.message : String(error),
        output.stdout ? `Obsidian stdout:\n${output.stdout}` : undefined,
        output.stderr ? `Obsidian stderr:\n${output.stderr}` : undefined,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}
