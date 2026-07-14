import { resolve } from "node:path";
import {
  createTemporaryVault,
  discoverObsidianCli,
  requireObsidianBinary,
  startObsidianPluginSession,
  withObsidianPage,
  type ObsidianPluginSession,
  type TemporaryVault,
} from "@vrtmrz/obsidian-test-session";

export const HARNESS_PLUGIN_ID = "fancy-kit-harness";

export interface HarnessState {
  mode: "review" | "showcase" | "automation" | null;
  pendingRun: {
    requestId: string;
    scenarios: readonly string[];
  } | null;
  pendingRunError: string | null;
  activeRequestId: string | null;
  completedRequestId: string | null;
  lastStory: string | null;
  lastAction: string | null;
  lastResult: unknown;
  progressState: string | null;
  progressValue: number;
  remainingSeconds: number | null;
  transcript: readonly { event: string }[];
  guidedReview: {
    step: string;
    timed: { outcome: string; displayStayedAwake: string | null };
    release: {
      outcome: string;
      displaySwitchedOff: string | null;
      activeLeaseCountAtStart: number | null;
      sentinelHeldAtStart: boolean | null;
    };
  };
  suite: {
    selected: readonly string[];
    running: boolean;
    current: string | null;
    results: Record<string, { status: string; detail: string | null }>;
  };
}

interface HarnessPluginAccess {
  readonly e2e: HarnessState;
  createMarkdownReport(): string;
}

export interface HarnessTestSession {
  session: ObsidianPluginSession;
  vault: TemporaryVault;
}

export async function startHarnessTestSession(
  pluginData: unknown = { schemaVersion: 1, mode: "automation" },
): Promise<HarnessTestSession> {
  const binary = requireObsidianBinary();
  const cli = discoverObsidianCli();
  if (!cli.binary)
    throw new Error(
      `Could not find obsidian-cli. Checked: ${cli.checked.join(", ")}`,
    );
  const vault = await createTemporaryVault({
    prefix: "fancy-kit-harness-e2e-",
    pluginIds: [HARNESS_PLUGIN_ID],
    idPrefix: "fancy-kit-harness-e2e",
  });
  try {
    const session = await startObsidianPluginSession({
      binary,
      cliBinary: cli.binary,
      vault,
      pluginId: HARNESS_PLUGIN_ID,
      artifactRoot: resolve("apps/obsidian-harness"),
      pluginData,
      startupGraceMs: Number(
        process.env.E2E_OBSIDIAN_STARTUP_GRACE_MS ?? 1_000,
      ),
    });
    return { session, vault };
  } catch (error) {
    await vault.dispose();
    throw error;
  }
}

export async function stopHarnessTestSession(
  testSession: HarnessTestSession,
): Promise<void> {
  await testSession.session.app.stop();
  await testSession.vault.dispose();
}

export async function executeHarnessStory(
  session: ObsidianPluginSession,
  story: string,
): Promise<void> {
  const commandId = `${HARNESS_PLUGIN_ID}:story-${story}`;
  const executed = await withObsidianPage(
    session.remoteDebuggingPort,
    async (page) =>
      await page.evaluate((id) => {
        const obsidianApp = (
          globalThis as typeof globalThis & {
            app?: {
              commands?: { executeCommandById(commandId: string): boolean };
            };
          }
        ).app;
        return obsidianApp?.commands?.executeCommandById(id) ?? false;
      }, commandId),
  );
  if (!executed)
    throw new Error(`Harness command was not executed: ${commandId}`);
}

export async function executeHarnessCommand(
  session: ObsidianPluginSession,
  command: string,
): Promise<void> {
  const commandId = `${HARNESS_PLUGIN_ID}:${command}`;
  const executed = await withObsidianPage(
    session.remoteDebuggingPort,
    async (page) =>
      await page.evaluate((id) => {
        const obsidianApp = (
          globalThis as typeof globalThis & {
            app?: {
              commands?: { executeCommandById(commandId: string): boolean };
            };
          }
        ).app;
        return obsidianApp?.commands?.executeCommandById(id) ?? false;
      }, commandId),
  );
  if (!executed)
    throw new Error(`Harness command was not executed: ${commandId}`);
}

export async function readHarnessState(
  session: ObsidianPluginSession,
): Promise<HarnessState> {
  return await withObsidianPage(
    session.remoteDebuggingPort,
    async (page) =>
      await page.evaluate((pluginId) => {
        const obsidianApp = (
          globalThis as typeof globalThis & {
            app?: {
              plugins?: { plugins?: Record<string, HarnessPluginAccess> };
            };
          }
        ).app;
        const state = obsidianApp?.plugins?.plugins?.[pluginId]?.e2e;
        if (state === undefined)
          throw new Error(`Harness plug-in is not loaded: ${pluginId}`);
        return state;
      }, HARNESS_PLUGIN_ID),
  );
}

export async function readHarnessMarkdownReport(
  session: ObsidianPluginSession,
): Promise<string> {
  return await withObsidianPage(
    session.remoteDebuggingPort,
    async (page) =>
      await page.evaluate((pluginId) => {
        const obsidianApp = (
          globalThis as typeof globalThis & {
            app?: {
              plugins?: { plugins?: Record<string, HarnessPluginAccess> };
            };
          }
        ).app;
        const plugin = obsidianApp?.plugins?.plugins?.[pluginId];
        if (plugin === undefined)
          throw new Error(`Harness plug-in is not loaded: ${pluginId}`);
        return plugin.createMarkdownReport();
      }, HARNESS_PLUGIN_ID),
  );
}

export async function waitForHarnessState(
  session: ObsidianPluginSession,
  predicate: (state: HarnessState) => boolean,
  description: string,
  timeoutMs = Number(process.env.E2E_OBSIDIAN_STORY_TIMEOUT_MS ?? 10_000),
): Promise<HarnessState> {
  const deadline = Date.now() + timeoutMs;
  let state: HarnessState | undefined;
  while (Date.now() < deadline) {
    state = await readHarnessState(session);
    if (predicate(state)) return state;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Timed out waiting for ${description}. Last state: ${JSON.stringify(state)}`,
  );
}
