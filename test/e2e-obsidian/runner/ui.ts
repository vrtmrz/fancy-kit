import { chromium, type Page } from "playwright";

export function obsidianRemoteDebuggingPort(): number {
    const port = Number(process.env.E2E_OBSIDIAN_REMOTE_DEBUGGING_PORT ?? 20000 + (process.pid % 20000));
    process.env.E2E_OBSIDIAN_REMOTE_DEBUGGING_PORT = String(port);
    return port;
}

async function waitForCdp(port: number): Promise<void> {
    const deadline = Date.now() + Number(process.env.E2E_OBSIDIAN_CDP_TIMEOUT_MS ?? 30000);
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`http://127.0.0.1:${port}/json/version`);
            if (response.ok) {
                return;
            }
        } catch {
            // Keep polling until Obsidian exposes the debugging endpoint.
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Timed out waiting for Obsidian DevTools endpoint on port ${port}`);
}

export async function withObsidianPage<T>(port: number, operation: (page: Page) => Promise<T>): Promise<T> {
    await waitForCdp(port);
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    try {
        const context = browser.contexts()[0];
        const page = context.pages()[0] ?? (await context.waitForEvent("page", { timeout: 10000 }));
        return await operation(page);
    } finally {
        await browser.close();
    }
}

export async function preseedTrustedVaultState(port: number, vaultId: string): Promise<void> {
    await withObsidianPage(port, async (page) => {
        await page.evaluate((id) => {
            localStorage.setItem(`enable-plugin-${id}`, "true");
        }, vaultId);
        // Reloading here can interrupt the vault URI that is still being handled
        // during startup. localStorage is synchronous, so the active renderer can
        // continue the original open flow without a reload.
        await page.waitForTimeout(250);
    });
}

export async function trustVaultIfPrompted(port: number): Promise<void> {
    await withObsidianPage(port, async (page) => {
        const deadline = Date.now() + Number(process.env.E2E_OBSIDIAN_TRUST_PROMPT_TIMEOUT_MS ?? 30000);
        while (Date.now() < deadline) {
            const yesButton = page.getByRole("button", { name: "Yes" });
            if (await yesButton.isVisible({ timeout: 1000 }).catch(() => false)) {
                await yesButton.click();
                await page.waitForTimeout(500);
                continue;
            }

            const trustButton = page.getByText("Trust author and enable plugins");
            if (await trustButton.isVisible({ timeout: 1000 }).catch(() => false)) {
                await trustButton.click();
                await page.waitForTimeout(500);
                continue;
            }

            const workspace = page.locator(".workspace");
            if (await workspace.isVisible({ timeout: 1000 }).catch(() => false)) {
                return;
            }
        }
    });
}

/** Waits until the active Obsidian renderer exposes a plug-in manifest. */
export async function waitForPluginCatalogue(
    port: number,
    pluginId: string,
    timeoutMs = Number(process.env.E2E_OBSIDIAN_CLI_READY_TIMEOUT_MS ?? 60000)
): Promise<void> {
    await withObsidianPage(port, async (page) => {
        await page.waitForFunction(
            (id) => {
                const obsidianApp = (
                    globalThis as typeof globalThis & {
                        app?: { plugins?: { manifests?: Record<string, unknown> } };
                    }
                ).app;
                return obsidianApp?.plugins?.manifests?.[id] !== undefined;
            },
            pluginId,
            { timeout: timeoutMs }
        );
    });
}

/** Enables community plug-ins and reloads one installed plug-in through the active renderer. */
export async function enableAndReloadPlugin(port: number, pluginId: string): Promise<void> {
    await withObsidianPage(port, async (page) => {
        await page.evaluate(async (id) => {
            const obsidianApp = (
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
            const plugins = obsidianApp?.plugins;
            if (plugins === undefined) throw new Error("Obsidian plug-in manager is unavailable");
            await plugins.setEnable(true);
            if (plugins.plugins[id] !== undefined) await plugins.unloadPlugin(id);
            await plugins.loadPlugin(id);
        }, pluginId);
    });
}

/** Waits for, or removes, a stale startup overlay in one Obsidian renderer page. */
export async function waitForObsidianPageUiIdle(
    page: Page,
    timeoutMs = Number(process.env.E2E_OBSIDIAN_UI_IDLE_TIMEOUT_MS ?? 5000)
): Promise<void> {
    const startupOverlay = page.locator(".progress-bar-container");
    const hidden = await startupOverlay
        .waitFor({ state: "hidden", timeout: timeoutMs })
        .then(() => true)
        .catch(() => false);
    if (hidden) return;

    // Obsidian 1.12.7 can leave the startup shell attached in a fresh,
    // isolated profile even after the vault and plug-in are fully ready.
    // Remove only that stale shell so it cannot intercept feature UI input.
    await startupOverlay.evaluateAll((elements) => {
        for (const element of elements) element.remove();
    });
}

/** Waits until Obsidian's startup progress overlay no longer blocks interaction. */
export async function waitForObsidianUiIdle(port: number): Promise<void> {
    await withObsidianPage(port, waitForObsidianPageUiIdle);
}
