import { obsidianRemoteDebuggingPort, withObsidianPage } from "../runner/ui.ts";
import {
  executeShowcaseStory,
  startShowcaseTestSession,
  stopShowcaseTestSession,
  waitForShowcaseState,
  type ShowcaseTestSession,
} from "../runner/showcase.ts";

async function main(): Promise<void> {
  let testSession: ShowcaseTestSession | undefined;
  try {
    testSession = await startShowcaseTestSession();
    const { session } = testSession;
    const port = obsidianRemoteDebuggingPort();

    await executeShowcaseStory(session, "progress-start");
    await withObsidianPage(port, async (page) => {
      const notice = page.locator(".vpk-progress-notice").last();
      await notice.waitFor({ state: "visible", timeout: 10_000 });
      await notice.getByText("Showcase progress", { exact: true }).waitFor();
      await notice.getByText("0 / 3", { exact: true }).waitFor();
    });

    await executeShowcaseStory(session, "progress-step");
    await withObsidianPage(port, async (page) => {
      const notice = page.locator(".vpk-progress-notice").last();
      await notice.getByText("1 / 3", { exact: true }).waitFor();
      await notice.getByText("Step 1", { exact: true }).waitFor();
    });

    await executeShowcaseStory(session, "progress-step");
    await executeShowcaseStory(session, "progress-step");
    await waitForShowcaseState(
      session,
      (state) => state.progressState === "completed" && state.progressValue === 3,
      "completed progress state",
    );
    await withObsidianPage(port, async (page) => {
      await page.locator(".vpk-progress-notice").last().waitFor({ state: "hidden", timeout: 5_000 });
    });

    await executeShowcaseStory(session, "progress-start");
    await executeShowcaseStory(session, "progress-cancel");
    await waitForShowcaseState(session, (state) => state.progressState === "cancelled", "cancelled progress state");
    await withObsidianPage(port, async (page) => {
      await page.locator(".vpk-progress-notice").last().waitFor({ state: "hidden", timeout: 5_000 });
    });

    console.log("Real Obsidian progress stories passed.");
  } finally {
    if (testSession !== undefined) await stopShowcaseTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
