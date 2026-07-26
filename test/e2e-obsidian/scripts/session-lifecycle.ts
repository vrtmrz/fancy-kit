/**
 * Proves in real Obsidian that the high-level session completes controlled
 * preparation before the plug-in's first load. A tiny fixture plug-in records
 * the local-storage value it observes inside `onload()` and increments a
 * persistent load counter.
 *
 * The scenario uses one complete session because the ordering is the contract:
 * the local-storage state and consumer hook must both finish before the
 * fixture's first `onload()`, and the controlled loader must then persist and
 * load the plug-in exactly once. Splitting those assertions across independent
 * sessions would not detect an early automatic load followed by a compensating
 * reload.
 */
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  createTemporaryVault,
  discoverObsidianCli,
  requireObsidianBinary,
  startObsidianPluginSession,
  withObsidianPage,
  type ObsidianPluginSession,
} from "@vrtmrz/obsidian-test-session";

const PLUGIN_ID = "fancy-kit-session-lifecycle-fixture";
const INPUT_KEY = "fancy-kit-e2e-first-load-input";
const INPUT_VALUE = "prepared-before-first-load";
const OBSERVED_KEY = "fancy-kit-e2e-first-load-observed";
const LOAD_COUNT_KEY = "fancy-kit-e2e-first-load-count";

async function main(): Promise<void> {
  const binary = requireObsidianBinary();
  const cli = discoverObsidianCli();
  if (!cli.binary)
    throw new Error(
      `Could not find obsidian-cli. Checked: ${cli.checked.join(", ")}`,
    );

  const vault = await createTemporaryVault({
    prefix: "fancy-kit-session-lifecycle-e2e-",
    pluginIds: [PLUGIN_ID],
    idPrefix: "fancy-kit-session-lifecycle-e2e",
  });
  let session: ObsidianPluginSession | undefined;
  const phases: string[] = [];

  try {
    session = await startObsidianPluginSession({
      binary,
      cliBinary: cli.binary,
      vault,
      pluginId: PLUGIN_ID,
      artifactRoot: resolve(
        "test/e2e-obsidian/fixtures/session-lifecycle",
      ),
      localStorageEntries: {
        [INPUT_KEY]: INPUT_VALUE,
      },
      lifecycle: {
        beforeLaunch: async () => {
          phases.push("beforeLaunch");
        },
        afterLaunch: async () => {
          phases.push("afterLaunch");
        },
        beforePluginStart: async ({ remoteDebuggingPort }) => {
          phases.push("beforePluginStart");
          const state = await withObsidianPage(
            remoteDebuggingPort,
            async (page) =>
              await page.evaluate(
                ({ inputKey, pluginId }) => {
                  const obsidianApp = (
                    globalThis as typeof globalThis & {
                      app?: {
                        plugins?: { plugins?: Record<string, unknown> };
                      };
                    }
                  ).app;
                  return {
                    input: localStorage.getItem(inputKey),
                    loaded:
                      obsidianApp?.plugins?.plugins?.[pluginId] !== undefined,
                  };
                },
                { inputKey: INPUT_KEY, pluginId: PLUGIN_ID },
              ),
          );
          if (state.input !== INPUT_VALUE)
            throw new Error(
              "Supplied local-storage value was not written before plug-in start",
            );
          if (state.loaded)
            throw new Error("Fixture plug-in loaded before beforePluginStart");
        },
        afterPluginLoad: async () => {
          phases.push("afterPluginLoad");
        },
        afterReady: async ({ remoteDebuggingPort }) => {
          phases.push("afterReady");
          const screenshotPath =
            process.env.E2E_OBSIDIAN_SESSION_LIFECYCLE_SCREENSHOT;
          if (screenshotPath)
            await withObsidianPage(remoteDebuggingPort, async (page) => {
              await page.screenshot({ path: screenshotPath, fullPage: true });
            });
        },
      },
      startupGraceMs: Number(
        process.env.E2E_OBSIDIAN_STARTUP_GRACE_MS ?? 1_000,
      ),
    });

    const observed = await withObsidianPage(
      session.remoteDebuggingPort,
      async (page) =>
        await page.evaluate(
          ({ countKey, observedKey }) => ({
            count: localStorage.getItem(countKey),
            observed: localStorage.getItem(observedKey),
          }),
          { countKey: LOAD_COUNT_KEY, observedKey: OBSERVED_KEY },
        ),
    );
    const enabledPlugins = JSON.parse(
      await readFile(
        join(vault.path, ".obsidian", "community-plugins.json"),
        "utf8",
      ),
    ) as unknown;
    const rendererPluginState = await withObsidianPage(
      session.remoteDebuggingPort,
      async (page) =>
        await page.evaluate((pluginId) => {
          const obsidianApp = (
            globalThis as typeof globalThis & {
              app?: {
                plugins?: {
                  enabledPlugins?: Set<string>;
                  plugins?: Record<string, unknown>;
                };
              };
            }
          ).app;
          return {
            enabled:
              obsidianApp?.plugins?.enabledPlugins?.has(pluginId) ?? false,
            loaded:
              obsidianApp?.plugins?.plugins?.[pluginId] !== undefined,
          };
        }, PLUGIN_ID),
    );

    if (observed.observed !== INPUT_VALUE)
      throw new Error(
        `Fixture first load observed ${JSON.stringify(observed.observed)}`,
      );
    if (observed.count !== "1")
      throw new Error(
        `Fixture plug-in loaded ${JSON.stringify(observed.count)} times`,
      );
    if (!rendererPluginState.enabled || !rendererPluginState.loaded)
      throw new Error(
        `Controlled start did not enable and load the plug-in: ${JSON.stringify(rendererPluginState)}`,
      );
    if (
      !Array.isArray(enabledPlugins) ||
      !enabledPlugins.includes(PLUGIN_ID)
    )
      throw new Error(
        `Controlled start did not persist plug-in enablement: ${JSON.stringify({
          enabledPlugins,
          rendererPluginState,
        })}`,
      );

    const expectedPhases = [
      "beforeLaunch",
      "afterLaunch",
      "beforePluginStart",
      "afterPluginLoad",
      "afterReady",
    ];
    if (JSON.stringify(phases) !== JSON.stringify(expectedPhases))
      throw new Error(
        `Unexpected lifecycle order: ${JSON.stringify(phases)}`,
      );

    console.log(
      JSON.stringify({
        pluginId: PLUGIN_ID,
        pluginStartup: "controlled",
        phases,
        firstLoadObservedPreloadedState: true,
        loadCount: 1,
        enablementPersisted: true,
      }),
    );
  } finally {
    await session?.app.stop();
    await vault.dispose();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
