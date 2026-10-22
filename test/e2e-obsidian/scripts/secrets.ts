/** Qualifies the injected adapter in an owned Vault/profile, including restart. */
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
import type SecretStorageFixture from "../fixtures/secret-storage/main.js";

const pluginId = "fancy-kit-secret-storage-fixture";

async function main(): Promise<void> {
  if (process.env.E2E_OBSIDIAN_ARGS || process.env.E2E_OBSIDIAN_USE_USER_DATA_DIR === "false") {
    throw new Error("SecretStorage verification requires the isolated profile and standard launch arguments");
  }
  const binary = requireObsidianBinary();
  const policy = obsidianE2EVersionPolicy();
  const artifactRoot = await mkdtemp(join(tmpdir(), "fancy-kit-secrets-artifact-"));
  let vault: Awaited<ReturnType<typeof createTemporaryVault>> | undefined;
  let app: ObsidianProcess | undefined;
  let rendererReady = false;
  const port = obsidianRemoteDebuggingPort();
  const prefix = `fancy-kit-${randomUUID().slice(0, 8)}`;

  async function stop(): Promise<void> {
    const running = app;
    app = undefined;
    const closeRenderer = rendererReady;
    rendererReady = false;
    if (!running) return;
    try {
      // Closing the Vault renderer allows Chromium to flush profile-backed state.
      if (closeRenderer) {
        await withObsidianPage(port, async (page) => { await page.close(); });
      }
    } finally {
      await running.stop();
    }
  }

  try {
    await build({
      entryPoints: [resolve("test/e2e-obsidian/fixtures/secret-storage/main.ts")],
      outfile: join(artifactRoot, "main.js"),
      bundle: true,
      external: ["obsidian"],
      format: "cjs",
      platform: "browser",
      target: "es2022",
    });
    await writeFile(join(artifactRoot, "manifest.json"), JSON.stringify({
      id: pluginId,
      name: "SecretStorage contract fixture",
      version: "0.0.0",
      minAppVersion: "1.11.4",
      description: "Synthetic SecretStorage contract verification in an isolated profile",
      author: "Fancy Kit",
      isDesktopOnly: true,
    }));
    vault = await createTemporaryVault({
      prefix: "fancy-kit-secrets-e2e-",
      idPrefix: "fancy-kit-secrets-e2e",
    });
    await installBuiltPlugin(vault.path, { pluginId, artifactRoot });
    const results: Record<string, Record<string, boolean>> = {};
    let observedVersion: string | undefined;
    for (const phase of ["initial", "restart"] as const) {
      // The lower-level launcher also supports pre-CLI Obsidian versions.
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
      results[phase] = await withObsidianPage(port, async (page) => await page.evaluate(
        async ({ id, prefix, write }) => {
          const app = (globalThis as typeof globalThis & {
            app: { plugins: { plugins: Record<string, SecretStorageFixture> } };
          }).app;
          return await app.plugins.plugins[id].exercise(prefix, write);
        },
        { id: pluginId, prefix, write: phase === "initial" },
      ));
      await stop();
      console.log(JSON.stringify({
        event: "secret-storage-contract", version: selection.version,
        support: selection.support, phase, results: results[phase],
      }));
    }
    const failed = Object.entries(results).flatMap(([phase, cases]) =>
      Object.entries(cases).filter(([, passed]) => !passed).map(([name]) => `${phase}:${name}`),
    );
    if (failed.length) throw new Error(`SecretStorage contract failures: ${failed.join(", ")}`);
  } finally {
    try { await stop(); } finally {
      try { await vault?.dispose(); } finally {
        await rm(artifactRoot, { recursive: true, force: true });
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
