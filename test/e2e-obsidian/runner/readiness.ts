import { evalObsidianJson } from "./cli.ts";

export interface PluginReadiness {
  status: "ready";
  pluginId: string;
  pluginVersion: string;
  vaultName: string;
}

export async function waitForPluginReady(
  cliBinary: string,
  env: NodeJS.ProcessEnv,
  pluginId: string,
  timeoutMs = Number(process.env.E2E_OBSIDIAN_READY_TIMEOUT_MS ?? 20_000),
): Promise<PluginReadiness> {
  const id = JSON.stringify(pluginId);
  const deadline = Date.now() + timeoutMs;
  let lastOutput = "";
  while (Date.now() < deadline) {
    try {
      const readiness = await evalObsidianJson<PluginReadiness>(
        cliBinary,
        [
          "(async()=>JSON.stringify({",
          `status:!!app.plugins.plugins[${id}]?'ready':'pending',`,
          `pluginId:${id},`,
          `pluginVersion:app.plugins.manifests[${id}]?.version,`,
          "vaultName:app.vault.getName()",
          "}))()",
        ].join(""),
        env,
      );
      if (readiness.status === "ready") return readiness;
    } catch (error) {
      lastOutput = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for plugin readiness (${pluginId}).\n${lastOutput}`);
}
