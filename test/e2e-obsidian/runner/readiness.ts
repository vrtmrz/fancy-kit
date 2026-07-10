import { withObsidianPage } from "./ui.ts";

export interface PluginReadiness {
  status: "ready";
  pluginId: string;
  pluginVersion: string;
  vaultName: string;
}

export async function waitForPluginReady(
  remoteDebuggingPort: number,
  pluginId: string,
  timeoutMs = Number(process.env.E2E_OBSIDIAN_READY_TIMEOUT_MS ?? 20_000),
): Promise<PluginReadiness> {
  return await withObsidianPage(remoteDebuggingPort, async (page) => {
    await page.waitForFunction(
      (id) => {
        const obsidianApp = (
          globalThis as typeof globalThis & {
            app?: { plugins?: { plugins?: Record<string, unknown> } };
          }
        ).app;
        return obsidianApp?.plugins?.plugins?.[id] !== undefined;
      },
      pluginId,
      { timeout: timeoutMs },
    );

    return await page.evaluate((id) => {
      const obsidianApp = (
        globalThis as typeof globalThis & {
          app?: {
            plugins?: { manifests?: Record<string, { version?: string }> };
            vault?: { getName(): string };
          };
        }
      ).app;
      return {
        status: "ready" as const,
        pluginId: id,
        pluginVersion: obsidianApp?.plugins?.manifests?.[id]?.version ?? "unknown",
        vaultName: obsidianApp?.vault?.getName() ?? "unknown",
      };
    }, pluginId);
  });
}
