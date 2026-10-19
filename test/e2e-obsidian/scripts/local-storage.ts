/** Verifies local-storage adapters in an owned Vault and isolated profile, including restart. */
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import {
  createTemporaryVault,
  ensurePluginLoaded,
  installBuiltPlugin,
  launchObsidian,
  obsidianE2EVersionPolicy,
  obsidianRemoteDebuggingPort,
  requireObsidianBinary,
  selectObsidianVersion,
  trustVaultIfPrompted,
  waitForObsidianVault,
  waitForPluginCatalogue,
  waitForPluginReady,
  withObsidianPage,
  type ObsidianProcess,
} from "@vrtmrz/obsidian-test-session";
import type {
  LocalStorageFixtureInput,
  LocalStorageFixtureRun,
} from "../fixtures/local-storage/main.js";

const pluginId = "fancy-kit-local-storage-fixture";
const phases = ["initial", "restart"] as const;

async function main(): Promise<void> {
  if (process.env.E2E_OBSIDIAN_ARGS || process.env.E2E_OBSIDIAN_USE_USER_DATA_DIR === "false") {
    throw new Error("Local-storage verification requires an isolated profile and standard launch arguments");
  }
  const binary = requireObsidianBinary();
  const policy = obsidianE2EVersionPolicy();
  const artifactRoot = await mkdtemp(join(tmpdir(), "fancy-kit-local-storage-artifact-"));
  let vault: Awaited<ReturnType<typeof createTemporaryVault>> | undefined;
  let app: ObsidianProcess | undefined;
  let rendererReady = false;
  const port = obsidianRemoteDebuggingPort();
  const runId = randomUUID();
  const inputBase = {
    officialPrefix: `${pluginId}:official:${runId}:`,
    legacyPrefix: `fancy-kit-e2e-legacy:${runId}:`,
    separatedPrefix: `${pluginId}:separated:${runId}:`,
  };
  const results: Partial<Record<(typeof phases)[number], LocalStorageFixtureRun>> = {};
  let observedVersion: string | undefined;
  let observedMode: LocalStorageFixtureRun["mode"] | undefined;

  async function stop(): Promise<void> {
    const running = app;
    app = undefined;
    const closeRenderer = rendererReady;
    rendererReady = false;
    if (!running) return;
    try {
      // Close the Vault renderer so the isolated profile can flush its state.
      if (closeRenderer) {
        await withObsidianPage(port, async (page) => { await page.close(); });
      }
    } finally {
      await running.stop();
    }
  }

  try {
    await build({
      entryPoints: [resolve("test/e2e-obsidian/fixtures/local-storage/main.ts")],
      outfile: join(artifactRoot, "main.js"),
      bundle: true,
      external: ["obsidian"],
      format: "cjs",
      platform: "browser",
      target: "es2022",
      alias: {
        "@vrtmrz/obsidian-plugin-kit/local-storage": resolve(
          "packages/obsidian-plugin-kit/src/local-storage.ts",
        ),
        "@vrtmrz/local-storage/web-storage": resolve(
          "packages/local-storage/src/web-storage.ts",
        ),
        "@vrtmrz/local-storage": resolve("packages/local-storage/src/index.ts"),
      },
    });
    await writeFile(join(artifactRoot, "manifest.json"), JSON.stringify({
      id: pluginId,
      name: "Local storage contract fixture",
      version: "0.0.0",
      minAppVersion: "0.0.0",
      description: "Synthetic local-storage contract verification in an isolated profile",
      author: "Fancy Kit",
      isDesktopOnly: true,
    }));
    vault = await createTemporaryVault({
      prefix: "fancy-kit-local-storage-e2e-",
      idPrefix: "fancy-kit-local-storage-e2e",
    });
    await installBuiltPlugin(vault.path, { pluginId, artifactRoot });

    for (const phase of phases) {
      app = await launchObsidian({
        binary,
        vaultPath: vault.path,
        homePath: vault.homePath,
        xdgConfigPath: vault.xdgConfigPath,
        xdgCachePath: vault.xdgCachePath,
        xdgDataPath: vault.xdgDataPath,
        userDataPath: vault.userDataPath,
        remoteDebuggingPort: port,
        staleProcessPattern: vault.processMarker,
        env: {
          ...process.env,
          HOME: vault.homePath,
          XDG_CONFIG_HOME: vault.xdgConfigPath,
          XDG_CACHE_HOME: vault.xdgCachePath,
          XDG_DATA_HOME: vault.xdgDataPath,
        },
      });
      await waitForObsidianVault(port, vault.path);
      rendererReady = true;
      await trustVaultIfPrompted(port);
      await waitForPluginCatalogue(port, pluginId);
      await ensurePluginLoaded(port, pluginId);
      const ready = await waitForPluginReady(port, pluginId);
      if (policy.expectedVersion && ready.obsidianVersion !== policy.expectedVersion) {
        throw new Error(`Expected Obsidian ${policy.expectedVersion}; observed ${ready.obsidianVersion}`);
      }
      const selection = selectObsidianVersion(ready.obsidianVersion, policy.allowUnverifiedVersion);
      if (observedVersion && observedVersion !== selection.version) {
        throw new Error("The Obsidian API version changed across restart");
      }
      observedVersion = selection.version;
      const input: LocalStorageFixtureInput = { ...inputBase, write: phase === "initial" };
      const result = await withObsidianPage(port, async (page) => await page.evaluate(
        async ({ id, fixtureInput }) => {
          const app = (globalThis as typeof globalThis & {
            app?: {
              plugins?: {
                plugins?: Record<string, {
                  exercise(input: LocalStorageFixtureInput): Promise<LocalStorageFixtureRun>;
                }>;
              };
            };
          }).app;
          const fixture = app?.plugins?.plugins?.[id];
          if (!fixture) throw new Error("The local-storage fixture plug-in is unavailable");
          return await fixture.exercise(fixtureInput);
        },
        { id: pluginId, fixtureInput: input },
      ));
      results[phase] = result;
      if (observedMode && observedMode !== result.mode) {
        throw new Error("The selected local-storage backend changed across restart");
      }
      observedMode = result.mode;
      if (result.legacySupplierCalls !== (result.mode === "official" ? 0 : 1)) {
        throw new Error("The compatibility factory did not use the expected lazy legacy-provider count");
      }
      const failed = Object.entries(result.checks)
        .filter(([, passed]) => !passed)
        .map(([name]) => name);
      if (failed.length) {
        throw new Error(`${phase} local-storage checks failed: ${failed.join(", ")}`);
      }
      await stop();
      console.log(JSON.stringify({
        event: "local-storage-contract",
        version: selection.version,
        support: selection.support,
        phase,
        mode: result.mode,
        officialMethodsAvailable: result.officialMethodsAvailable,
        legacySupplierCalls: result.legacySupplierCalls,
        checks: result.checks,
      }));
    }
  } finally {
    try {
      await stop();
    } finally {
      try {
        await vault?.dispose();
      } finally {
        await rm(artifactRoot, { recursive: true, force: true });
      }
    }
  }

  const failed = Object.entries(results).flatMap(([phase, result]) =>
    Object.entries(result?.checks ?? {})
      .filter(([, passed]) => !passed)
      .map(([name]) => `${phase}:${name}`),
  );
  if (failed.length) throw new Error(`Local-storage contract failures: ${failed.join(", ")}`);
  if (results.initial === undefined || results.restart === undefined) {
    throw new Error("Local-storage verification did not complete both renderer phases");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
