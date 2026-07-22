import { resolve } from "node:path";
import {
  createTemporaryVault,
  discoverObsidianCli,
  requireObsidianBinary,
  startObsidianPluginSession,
  withObsidianPage,
  type ObsidianPluginSession,
} from "@vrtmrz/obsidian-test-session";
import { HARNESS_PLUGIN_ID } from "../runner/harness.ts";

const STORAGE_KEY = "fancy-kit-e2e-profile-restart";
const STORAGE_VALUE = "preserved";

async function startSession(
  binary: string,
  cliBinary: string,
  vault: Awaited<ReturnType<typeof createTemporaryVault>>,
  pluginData?: unknown,
): Promise<ObsidianPluginSession> {
  return await startObsidianPluginSession({
    binary,
    cliBinary,
    vault,
    pluginId: HARNESS_PLUGIN_ID,
    artifactRoot: resolve("apps/obsidian-harness"),
    pluginData,
    startupGraceMs: Number(process.env.E2E_OBSIDIAN_STARTUP_GRACE_MS ?? 1_000),
  });
}

async function main(): Promise<void> {
  const binary = requireObsidianBinary();
  const cli = discoverObsidianCli();
  if (!cli.binary) {
    throw new Error(
      `Could not find obsidian-cli. Checked: ${cli.checked.join(", ")}`,
    );
  }

  const vault = await createTemporaryVault({
    prefix: "fancy-kit-profile-restart-e2e-",
    pluginIds: [HARNESS_PLUGIN_ID],
    idPrefix: "fancy-kit-profile-restart-e2e",
  });
  let session: ObsidianPluginSession | undefined;

  try {
    session = await startSession(binary, cli.binary, vault, {
      schemaVersion: 1,
      mode: "automation",
    });
    await withObsidianPage(session.remoteDebuggingPort, async (page) => {
      await page.evaluate(([key, value]) => localStorage.setItem(key, value), [
        STORAGE_KEY,
        STORAGE_VALUE,
      ] as const);
    });
    await session.app.stop();
    session = undefined;

    session = await startSession(binary, cli.binary, vault);
    const restored = await withObsidianPage(
      session.remoteDebuggingPort,
      async (page) =>
        await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
    );
    if (restored !== STORAGE_VALUE) {
      throw new Error(
        `The isolated Obsidian profile did not retain local storage across restart. Expected ${JSON.stringify(STORAGE_VALUE)}, received ${JSON.stringify(restored)}.`,
      );
    }

    console.log(
      "The isolated Obsidian profile retained local storage across restart.",
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
