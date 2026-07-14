import { withObsidianPage } from "@vrtmrz/obsidian-test-session";
import {
  executeHarnessStory,
  startHarnessTestSession,
  stopHarnessTestSession,
  waitForHarnessState,
  type HarnessTestSession,
} from "../runner/harness.ts";

async function main(): Promise<void> {
  let testSession: HarnessTestSession | undefined;
  try {
    testSession = await startHarnessTestSession();
    const { session } = testSession;
    const port = session.remoteDebuggingPort;

    await executeHarnessStory(session, "progress-start");
    await withObsidianPage(port, async (page) => {
      const notice = page.locator(".vpk-progress-notice").last();
      await notice.waitFor({ state: "visible", timeout: 10_000 });
      await notice.getByText("Showcase progress", { exact: true }).waitFor();
      await notice.getByText("0 / 3", { exact: true }).waitFor();
    });

    await executeHarnessStory(session, "progress-step");
    await withObsidianPage(port, async (page) => {
      const notice = page.locator(".vpk-progress-notice").last();
      await notice.getByText("1 / 3", { exact: true }).waitFor();
      await notice.getByText("Step 1", { exact: true }).waitFor();
    });

    await executeHarnessStory(session, "progress-step");
    await executeHarnessStory(session, "progress-step");
    await waitForHarnessState(
      session,
      (state) =>
        state.progressState === "completed" && state.progressValue === 3,
      "completed progress state",
    );
    await withObsidianPage(port, async (page) => {
      await page
        .locator(".vpk-progress-notice")
        .last()
        .waitFor({ state: "hidden", timeout: 5_000 });
    });

    await executeHarnessStory(session, "progress-start");
    await executeHarnessStory(session, "progress-cancel");
    await waitForHarnessState(
      session,
      (state) => state.progressState === "cancelled",
      "cancelled progress state",
    );
    await withObsidianPage(port, async (page) => {
      await page
        .locator(".vpk-progress-notice")
        .last()
        .waitFor({ state: "hidden", timeout: 5_000 });
    });

    console.log("Real Obsidian progress stories passed.");
  } finally {
    if (testSession !== undefined) await stopHarnessTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
