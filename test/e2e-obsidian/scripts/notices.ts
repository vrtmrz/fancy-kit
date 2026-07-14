import { withObsidianPage } from "@vrtmrz/obsidian-test-session";
import {
  executeHarnessStory,
  startHarnessTestSession,
  stopHarnessTestSession,
  type HarnessTestSession,
} from "../runner/harness.ts";

async function main(): Promise<void> {
  let testSession: HarnessTestSession | undefined;
  try {
    testSession = await startHarnessTestSession();
    const { session } = testSession;
    const port = session.remoteDebuggingPort;

    await executeHarnessStory(session, "notice-show");
    await withObsidianPage(port, async (page) => {
      const notice = page.locator(".vpk-keyed-notice");
      await notice.waitFor({ state: "visible", timeout: 10_000 });
      await notice.getByText("Scanning Vault: 1", { exact: true }).waitFor();
      await notice.evaluate((element) => {
        element.setAttribute("data-vpk-e2e-instance", "original");
      });
    });

    await executeHarnessStory(session, "notice-update");
    await withObsidianPage(port, async (page) => {
      const notice = page.locator(".vpk-keyed-notice");
      if ((await notice.count()) !== 1)
        throw new Error("Expected one keyed Notice after update");
      await notice.getByText("Scanning Vault: 2", { exact: true }).waitFor();
      const marker = await notice.getAttribute("data-vpk-e2e-instance");
      if (marker !== "original")
        throw new Error("Keyed Notice update replaced the visible DOM element");
      await notice.waitFor({ state: "hidden", timeout: 5_000 });
    });

    await executeHarnessStory(session, "notice-show");
    await executeHarnessStory(session, "notice-hide");
    await withObsidianPage(port, async (page) => {
      await page
        .locator(".vpk-keyed-notice")
        .last()
        .waitFor({ state: "hidden", timeout: 5_000 });
    });

    console.log("Real Obsidian keyed Notice stories passed.");
  } finally {
    if (testSession !== undefined) await stopHarnessTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
