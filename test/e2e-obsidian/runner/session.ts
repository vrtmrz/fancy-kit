import { openVaultWithObsidianCli } from "./cli.ts";
import { launchObsidian, type ObsidianProcess } from "./launch.ts";
import { installBuiltPlugin, type PluginInstallResult } from "./pluginInstaller.ts";
import { waitForPluginReady, type PluginReadiness } from "./readiness.ts";
import type { TemporaryVault } from "./vault.ts";
import {
  obsidianRemoteDebuggingPort,
  enableAndReloadPlugin,
  preseedTrustedVaultState,
  trustVaultIfPrompted,
  waitForObsidianUiIdle,
  waitForPluginCatalogue,
} from "./ui.ts";

export interface ObsidianPluginSession {
  app: ObsidianProcess;
  install: PluginInstallResult;
  readiness: PluginReadiness;
  pluginId: string;
  remoteDebuggingPort: number;
}

export interface StartObsidianPluginSessionOptions {
  binary: string;
  cliBinary: string;
  vault: TemporaryVault;
  pluginId: string;
  artifactRoot: string;
  startupGraceMs?: number;
}

export async function startObsidianPluginSession(
  options: StartObsidianPluginSessionOptions,
): Promise<ObsidianPluginSession> {
  const install = await installBuiltPlugin(options.vault.path, {
    pluginId: options.pluginId,
    artifactRoot: options.artifactRoot,
  });
  const remoteDebuggingPort = obsidianRemoteDebuggingPort();
  const app = await launchObsidian({
    binary: options.binary,
    vaultPath: options.vault.path,
    homePath: options.vault.homePath,
    xdgConfigPath: options.vault.xdgConfigPath,
    xdgCachePath: options.vault.xdgCachePath,
    xdgDataPath: options.vault.xdgDataPath,
    userDataPath: options.vault.userDataPath,
    startupGraceMs: options.startupGraceMs,
  });
  try {
    await preseedTrustedVaultState(remoteDebuggingPort, options.vault.id);
    await openVaultWithObsidianCli(options.cliBinary, options.vault.path, {
      ...process.env,
      HOME: options.vault.homePath,
      XDG_CONFIG_HOME: options.vault.xdgConfigPath,
      XDG_CACHE_HOME: options.vault.xdgCachePath,
      XDG_DATA_HOME: options.vault.xdgDataPath,
    });
    await trustVaultIfPrompted(remoteDebuggingPort);
    await waitForPluginCatalogue(remoteDebuggingPort, options.pluginId);
    await enableAndReloadPlugin(remoteDebuggingPort, options.pluginId);
    const readiness = await waitForPluginReady(remoteDebuggingPort, options.pluginId);
    await waitForObsidianUiIdle(remoteDebuggingPort);
    return {
      app,
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
