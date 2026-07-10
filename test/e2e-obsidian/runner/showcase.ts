import { resolve } from "node:path";
import { evalObsidianJson } from "./cli.ts";
import { discoverObsidianCli, requireObsidianBinary } from "./environment.ts";
import { startObsidianPluginSession, type ObsidianPluginSession } from "./session.ts";
import { createTemporaryVault, type TemporaryVault } from "./vault.ts";

export const SHOWCASE_PLUGIN_ID = "vpk-showcase";

export interface ShowcaseState {
  lastStory: string | null;
  lastResult: unknown;
  progressState: string | null;
  progressValue: number;
}

export interface ShowcaseTestSession {
  session: ObsidianPluginSession;
  vault: TemporaryVault;
}

export async function startShowcaseTestSession(): Promise<ShowcaseTestSession> {
  const binary = requireObsidianBinary();
  const cli = discoverObsidianCli();
  if (!cli.binary) throw new Error(`Could not find obsidian-cli. Checked: ${cli.checked.join(", ")}`);
  const vault = await createTemporaryVault("obsidian-plugin-kit-e2e-", [SHOWCASE_PLUGIN_ID]);
  try {
    const session = await startObsidianPluginSession({
      binary,
      cliBinary: cli.binary,
      vault,
      pluginId: SHOWCASE_PLUGIN_ID,
      artifactRoot: resolve("apps/obsidian-showcase"),
      startupGraceMs: Number(process.env.E2E_OBSIDIAN_STARTUP_GRACE_MS ?? 1_000),
    });
    return { session, vault };
  } catch (error) {
    await vault.dispose();
    throw error;
  }
}

export async function stopShowcaseTestSession(testSession: ShowcaseTestSession): Promise<void> {
  await testSession.session.app.stop();
  await testSession.vault.dispose();
}

export async function executeShowcaseStory(session: ObsidianPluginSession, story: string): Promise<void> {
  const commandId = `${SHOWCASE_PLUGIN_ID}:story-${story}`;
  const executed = await evalObsidianJson<boolean>(
    session.cliBinary,
    `JSON.stringify(app.commands.executeCommandById(${JSON.stringify(commandId)}))`,
    session.cliEnv,
  );
  if (!executed) throw new Error(`Showcase command was not executed: ${commandId}`);
}

export async function executeShowcaseCommand(session: ObsidianPluginSession, command: string): Promise<void> {
  const commandId = `${SHOWCASE_PLUGIN_ID}:${command}`;
  const executed = await evalObsidianJson<boolean>(
    session.cliBinary,
    `JSON.stringify(app.commands.executeCommandById(${JSON.stringify(commandId)}))`,
    session.cliEnv,
  );
  if (!executed) throw new Error(`Showcase command was not executed: ${commandId}`);
}

export async function readShowcaseState(session: ObsidianPluginSession): Promise<ShowcaseState> {
  const id = JSON.stringify(SHOWCASE_PLUGIN_ID);
  return await evalObsidianJson<ShowcaseState>(
    session.cliBinary,
    `JSON.stringify(app.plugins.plugins[${id}].e2e)`,
    session.cliEnv,
  );
}

export async function waitForShowcaseState(
  session: ObsidianPluginSession,
  predicate: (state: ShowcaseState) => boolean,
  description: string,
  timeoutMs = Number(process.env.E2E_OBSIDIAN_STORY_TIMEOUT_MS ?? 10_000),
): Promise<ShowcaseState> {
  const deadline = Date.now() + timeoutMs;
  let state: ShowcaseState | undefined;
  while (Date.now() < deadline) {
    state = await readShowcaseState(session);
    if (predicate(state)) return state;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${description}. Last state: ${JSON.stringify(state)}`);
}
