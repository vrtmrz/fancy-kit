import { evalObsidianJson, openVaultWithObsidianCli, runObsidianCli } from "./cli.ts";
import { launchObsidian, type ObsidianProcess } from "./launch.ts";
import { installBuiltPlugin, type PluginInstallResult } from "./pluginInstaller.ts";
import { waitForPluginReady, type PluginReadiness } from "./readiness.ts";
import type { TemporaryVault } from "./vault.ts";
import { obsidianRemoteDebuggingPort, preseedTrustedVaultState, trustVaultIfPrompted } from "./ui.ts";

export interface ObsidianPluginSession {
  app: ObsidianProcess;
  cliEnv: NodeJS.ProcessEnv;
  install: PluginInstallResult;
  readiness: PluginReadiness;
  pluginId: string;
  cliBinary: string;
}

export interface StartObsidianPluginSessionOptions {
  binary: string;
  cliBinary: string;
  vault: TemporaryVault;
  pluginId: string;
  artifactRoot: string;
  startupGraceMs?: number;
}

async function waitForPluginCatalogue(
  cliBinary: string,
  env: NodeJS.ProcessEnv,
  pluginId: string,
): Promise<void> {
  const id = JSON.stringify(pluginId);
  const deadline = Date.now() + Number(process.env.E2E_OBSIDIAN_CLI_READY_TIMEOUT_MS ?? 60_000);
  let lastOutput = "";
  while (Date.now() < deadline) {
    try {
      const result = await evalObsidianJson<{ found: boolean }>(
        cliBinary,
        `JSON.stringify({found:!!app.plugins?.manifests?.[${id}]})`,
        env,
      );
      if (result.found) return;
      lastOutput = JSON.stringify(result);
    } catch (error) {
      lastOutput = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for plugin catalogue (${pluginId}).\n${lastOutput}`);
}

async function enableCommunityPlugins(cliBinary: string, env: NodeJS.ProcessEnv): Promise<void> {
  const result = await runObsidianCli(cliBinary, ["eval", "code=(async()=>app.plugins.setEnable(true))()"], env);
  if (result.code !== 0 || result.stdout.includes("Error:")) {
    throw new Error(`Failed to enable community plugins.\n${result.stdout}\n${result.stderr}`);
  }
}

async function reloadPlugin(cliBinary: string, env: NodeJS.ProcessEnv, pluginId: string): Promise<void> {
  const result = await runObsidianCli(cliBinary, ["plugin:reload", `id=${pluginId}`], env);
  if (result.code !== 0 || result.stdout.includes("Error:")) {
    throw new Error(`Failed to reload ${pluginId}.\n${result.stdout}\n${result.stderr}`);
  }
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
  const cliEnv = {
    ...process.env,
    HOME: options.vault.homePath,
    XDG_CONFIG_HOME: options.vault.xdgConfigPath,
    XDG_CACHE_HOME: options.vault.xdgCachePath,
    XDG_DATA_HOME: options.vault.xdgDataPath,
  };

  try {
    await preseedTrustedVaultState(remoteDebuggingPort, options.vault.id);
    await openVaultWithObsidianCli(options.cliBinary, options.vault.path, cliEnv);
    await trustVaultIfPrompted(remoteDebuggingPort);
    await waitForPluginCatalogue(options.cliBinary, cliEnv, options.pluginId);
    await enableCommunityPlugins(options.cliBinary, cliEnv);
    await reloadPlugin(options.cliBinary, cliEnv, options.pluginId);
    const readiness = await waitForPluginReady(options.cliBinary, cliEnv, options.pluginId);
    return {
      app,
      cliEnv,
      install,
      readiness,
      pluginId: options.pluginId,
      cliBinary: options.cliBinary,
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
