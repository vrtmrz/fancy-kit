import { withObsidianPage } from "@vrtmrz/obsidian-test-session";
import {
  readHarnessState,
  startHarnessTestSession,
  stopHarnessTestSession,
  type HarnessTestSession,
} from "../runner/harness.ts";

async function main(): Promise<void> {
  let testSession: HarnessTestSession | undefined;
  try {
    testSession = await startHarnessTestSession();
    const state = await readHarnessState(testSession.session);
    if (state.mode !== "automation") {
      throw new Error(`Expected Automation mode, got ${String(state.mode)}`);
    }
    await withObsidianPage(
      testSession.session.remoteDebuggingPort,
      async (page) => {
        const chooser = page
          .locator(".modal-container .modal")
          .filter({ hasText: "Choose how to use Fancy Kit Harness" });
        if (await chooser.isVisible()) {
          throw new Error("Automation pluginData did not suppress mode selection");
        }
      },
    );
    console.log(
      `Harness ready: ${testSession.session.readiness.pluginId}@${testSession.session.readiness.pluginVersion}`,
    );
    console.log(`Temporary vault: ${testSession.vault.path}`);
  } finally {
    if (testSession !== undefined) await stopHarnessTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
