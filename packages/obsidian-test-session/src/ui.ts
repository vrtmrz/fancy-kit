import { chromium, type Page } from "playwright";

/** Basic readiness information read from the active Obsidian renderer. */
export interface PluginReadiness {
  /** Stable ready status. */
  status: "ready";
  /** Loaded plug-in identifier. */
  pluginId: string;
  /** Installed manifest version, or `unknown` when unavailable. */
  pluginVersion: string;
  /** Active vault name, or `unknown` when unavailable. */
  vaultName: string;
}

/**
 * Selects and records the remote-debugging port for one runner process.
 *
 * @param env - Environment containing an optional `E2E_OBSIDIAN_REMOTE_DEBUGGING_PORT`.
 * @returns A valid TCP port number.
 */
export function obsidianRemoteDebuggingPort(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const port = Number(
    env.E2E_OBSIDIAN_REMOTE_DEBUGGING_PORT ?? 20_000 + (process.pid % 20_000),
  );
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new RangeError(
      `Invalid Obsidian remote-debugging port: ${String(port)}`,
    );
  }
  env.E2E_OBSIDIAN_REMOTE_DEBUGGING_PORT = String(port);
  return port;
}

async function waitForCdp(port: number): Promise<void> {
  const deadline =
    Date.now() + Number(process.env.E2E_OBSIDIAN_CDP_TIMEOUT_MS ?? 30_000);
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {
      // Keep polling until Obsidian exposes the debugging endpoint.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Timed out waiting for Obsidian DevTools endpoint on port ${port}`,
  );
}

/**
 * Runs an operation against the active Obsidian Electron renderer.
 *
 * @param port - Electron remote-debugging port.
 * @param operation - Operation receiving the active renderer page.
 * @returns The operation result.
 */
export async function withObsidianPage<T>(
  port: number,
  operation: (page: Page) => Promise<T>,
): Promise<T> {
  await waitForCdp(port);
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  try {
    const context = browser.contexts()[0];
    if (context === undefined)
      throw new Error("Obsidian did not expose a browser context");
    const page =
      context.pages()[0] ??
      (await context.waitForEvent("page", { timeout: 10_000 }));
    return await operation(page);
  } finally {
    await browser.close();
  }
}

/**
 * Pre-seeds Obsidian's trusted-vault local-storage flag without reloading the renderer.
 *
 * @param port - Electron remote-debugging port.
 * @param vaultId - Vault registry identifier.
 */
export async function preseedTrustedVaultState(
  port: number,
  vaultId: string,
): Promise<void> {
  await withObsidianPage(port, async (page) => {
    await page.evaluate((id) => {
      localStorage.setItem(`enable-plugin-${id}`, "true");
    }, vaultId);
    // Reloading here can interrupt the vault URI still being handled during start-up.
    await page.waitForTimeout(250);
  });
}

/**
 * Waits until one renderer has opened the expected filesystem vault.
 *
 * @param page - Active Obsidian renderer page.
 * @param vaultPath - Exact filesystem path of the isolated vault.
 * @param timeoutMs - Vault-open timeout in milliseconds.
 */
export async function waitForObsidianPageVault(
  page: Page,
  vaultPath: string,
  timeoutMs = Number(process.env.E2E_OBSIDIAN_VAULT_TIMEOUT_MS ?? 30_000),
): Promise<void> {
  const readActivePath = () => {
    return page.evaluate(() => {
      const app = (
        globalThis as typeof globalThis & {
          app?: {
            vault?: {
              adapter?: {
                basePath?: string;
                getBasePath?: () => string;
              };
            };
          };
        }
      ).app;
      const adapter = app?.vault?.adapter;
      return adapter?.getBasePath?.() ?? adapter?.basePath ?? null;
    });
  };
  try {
    await page.waitForFunction(
      (expectedPath) => {
        const app = (
          globalThis as typeof globalThis & {
            app?: {
              vault?: {
                adapter?: {
                  basePath?: string;
                  getBasePath?: () => string;
                };
              };
            };
          }
        ).app;
        const adapter = app?.vault?.adapter;
        const activePath = adapter?.getBasePath?.() ?? adapter?.basePath;
        return activePath === expectedPath;
      },
      vaultPath,
      { timeout: timeoutMs },
    );
  } catch (error) {
    const activePath = await readActivePath().catch(() => null);
    throw new Error(
      `Timed out waiting for isolated Obsidian vault. expected=${vaultPath}, active=${activePath ?? "(none)"}`,
      { cause: error },
    );
  }
}

/**
 * Waits until the active renderer has opened the expected filesystem vault.
 *
 * @param port - Electron remote-debugging port.
 * @param vaultPath - Exact filesystem path of the isolated vault.
 * @param timeoutMs - Vault-open timeout in milliseconds.
 */
export async function waitForObsidianVault(
  port: number,
  vaultPath: string,
  timeoutMs?: number,
): Promise<void> {
  await withObsidianPage(
    port,
    async (page) => await waitForObsidianPageVault(page, vaultPath, timeoutMs),
  );
}

/**
 * Accepts Obsidian's trust prompts until the workspace becomes visible.
 *
 * @param port - Electron remote-debugging port.
 * @param timeoutMs - Overall prompt-handling timeout.
 */
export async function trustVaultIfPrompted(
  port: number,
  timeoutMs = Number(
    process.env.E2E_OBSIDIAN_TRUST_PROMPT_TIMEOUT_MS ?? 30_000,
  ),
): Promise<void> {
  await withObsidianPage(port, async (page) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const yesButton = page.getByRole("button", { name: "Yes" });
      if (await yesButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await yesButton.click();
        await page.waitForTimeout(500);
        continue;
      }

      const trustButton = page.getByText("Trust author and enable plugins");
      if (await trustButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await trustButton.click();
        await page.waitForTimeout(500);
        continue;
      }

      if (
        await page
          .locator(".workspace")
          .isVisible({ timeout: 1_000 })
          .catch(() => false)
      )
        return;
    }
    throw new Error(
      "Timed out waiting for the Obsidian workspace or trust prompt",
    );
  });
}

/**
 * Waits until the active renderer exposes an installed plug-in manifest.
 *
 * @param port - Electron remote-debugging port.
 * @param pluginId - Plug-in identifier.
 * @param timeoutMs - Catalogue timeout in milliseconds.
 */
export async function waitForPluginCatalogue(
  port: number,
  pluginId: string,
  timeoutMs = Number(
    process.env.E2E_OBSIDIAN_CATALOGUE_TIMEOUT_MS ??
      process.env.E2E_OBSIDIAN_CLI_READY_TIMEOUT_MS ??
      60_000,
  ),
): Promise<void> {
  await withObsidianPage(port, async (page) => {
    await page.waitForFunction(
      (id) => {
        const app = (
          globalThis as typeof globalThis & {
            app?: { plugins?: { manifests?: Record<string, unknown> } };
          }
        ).app;
        return app?.plugins?.manifests?.[id] !== undefined;
      },
      pluginId,
      { timeout: timeoutMs },
    );
  });
}

/**
 * Enables community plug-ins and reloads one installed plug-in through the active renderer.
 *
 * @param port - Electron remote-debugging port.
 * @param pluginId - Plug-in identifier to reload.
 */
export async function enableAndReloadPlugin(
  port: number,
  pluginId: string,
): Promise<void> {
  await withObsidianPage(port, async (page) => {
    await page.evaluate(async (id) => {
      const app = (
        globalThis as typeof globalThis & {
          app?: {
            plugins?: {
              plugins: Record<string, unknown>;
              setEnable(enabled: boolean): Promise<void>;
              unloadPlugin(pluginId: string): Promise<void>;
              loadPlugin(pluginId: string): Promise<void>;
            };
          };
        }
      ).app;
      const plugins = app?.plugins;
      if (plugins === undefined)
        throw new Error("Obsidian plug-in manager is unavailable");
      await plugins.setEnable(true);
      if (plugins.plugins[id] !== undefined) await plugins.unloadPlugin(id);
      await plugins.loadPlugin(id);
    }, pluginId);
  });
}

/**
 * Waits until an installed plug-in is loaded in the active renderer.
 *
 * @param port - Electron remote-debugging port.
 * @param pluginId - Plug-in identifier.
 * @param timeoutMs - Readiness timeout in milliseconds.
 * @returns Manifest and vault readiness information.
 */
export async function waitForPluginReady(
  port: number,
  pluginId: string,
  timeoutMs = Number(process.env.E2E_OBSIDIAN_READY_TIMEOUT_MS ?? 20_000),
): Promise<PluginReadiness> {
  return await withObsidianPage(port, async (page) => {
    await page.waitForFunction(
      (id) => {
        const app = (
          globalThis as typeof globalThis & {
            app?: { plugins?: { plugins?: Record<string, unknown> } };
          }
        ).app;
        return app?.plugins?.plugins?.[id] !== undefined;
      },
      pluginId,
      { timeout: timeoutMs },
    );

    return await page.evaluate((id) => {
      const app = (
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
        pluginVersion: app?.plugins?.manifests?.[id]?.version ?? "unknown",
        vaultName: app?.vault?.getName() ?? "unknown",
      };
    }, pluginId);
  });
}

/**
 * Waits for, or removes, a stale Obsidian start-up overlay in one renderer.
 *
 * @param page - Active Obsidian renderer page.
 * @param timeoutMs - Time allowed for the overlay to hide normally.
 */
export async function waitForObsidianPageUiIdle(
  page: Page,
  timeoutMs = Number(process.env.E2E_OBSIDIAN_UI_IDLE_TIMEOUT_MS ?? 5_000),
): Promise<void> {
  const startupOverlay = page.locator(".progress-bar-container");
  const hidden = await startupOverlay
    .waitFor({ state: "hidden", timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);
  if (hidden) return;

  // Obsidian 1.12.7 can leave this shell attached after the vault and plug-in are ready.
  await startupOverlay.evaluateAll((elements) => {
    for (const element of elements) element.remove();
  });
}

/**
 * Waits until Obsidian's start-up overlay no longer blocks interaction.
 *
 * @param port - Electron remote-debugging port.
 * @param timeoutMs - Time allowed for the overlay to hide normally.
 */
export async function waitForObsidianUiIdle(
  port: number,
  timeoutMs?: number,
): Promise<void> {
  await withObsidianPage(
    port,
    async (page) => await waitForObsidianPageUiIdle(page, timeoutMs),
  );
}
