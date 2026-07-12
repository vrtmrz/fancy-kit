import { openVaultWithObsidianCli } from "./cli.js";
import { launchObsidian, type ObsidianProcess } from "./launch.js";
import {
  installBuiltPlugin,
  type PluginInstallResult,
} from "./plugin-installer.js";
import {
  enableAndReloadPlugin,
  obsidianRemoteDebuggingPort,
  preseedTrustedVaultState,
  trustVaultIfPrompted,
  waitForObsidianVault,
  waitForObsidianUiIdle,
  waitForPluginCatalogue,
  waitForPluginReady,
  type PluginReadiness,
} from "./ui.js";
import type { TemporaryVault } from "./vault.js";

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
  /** Optional process environment overrides. */
  env?: NodeJS.ProcessEnv;
  /** Time that Obsidian must remain alive before launch succeeds. */
  startupGraceMs?: number;
  /** Whether to normalise a stale start-up overlay after readiness. Defaults to `true`. */
  waitForUiIdle?: boolean;
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
  const install = await installBuiltPlugin(options.vault.path, {
    pluginId: options.pluginId,
    artifactRoot: options.artifactRoot,
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
    await preseedTrustedVaultState(remoteDebuggingPort, options.vault.id);
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
    await enableAndReloadPlugin(remoteDebuggingPort, options.pluginId);
    const readiness = await waitForPluginReady(
      remoteDebuggingPort,
      options.pluginId,
    );
    if (options.waitForUiIdle !== false)
      await waitForObsidianUiIdle(remoteDebuggingPort);
    return {
      app,
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
