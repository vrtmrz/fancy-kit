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

    await executeHarnessStory(session, "notice-group-start");
    await withObsidianPage(port, async (page) => {
      const notice = page.locator(".notice:has(.vpk-keyed-notice-group)");
      await notice.waitFor({ state: "visible", timeout: 10_000 });
      await notice
        .getByText("Checking for incomplete documents...", { exact: true })
        .waitFor();
      await notice.evaluate((element) => {
        element.setAttribute("data-vpk-e2e-instance", "group-original");
      });
    });

    await executeHarnessStory(session, "notice-group-result");
    await withObsidianPage(port, async (page) => {
      const notice = page.locator(".notice:has(.vpk-keyed-notice-group)");
      if ((await notice.count()) !== 1)
        throw new Error("Expected one Notice for the named group");
      const rows = notice.locator(".vpk-keyed-notice-group__item");
      if ((await rows.count()) !== 2)
        throw new Error("Expected two named rows in the grouped Notice");
      await rows
        .nth(0)
        .getByText("Checking for incomplete documents...", { exact: true })
        .waitFor();
      await rows
        .nth(1)
        .getByText("No size mismatches found", { exact: true })
        .waitFor();
      if (
        (await notice.getAttribute("data-vpk-e2e-instance")) !==
        "group-original"
      ) {
        throw new Error("Grouped Notice update replaced the visible Notice");
      }
      await notice
        .getByRole("button", { name: "Dismiss this notification" })
        .waitFor();
    });

    await executeHarnessStory(session, "notice-group-finish");
    await withObsidianPage(port, async (page) => {
      await page
        .locator(".notice:has(.vpk-keyed-notice-group)")
        .waitFor({ state: "hidden", timeout: 5_000 });
    });

    await executeHarnessStory(session, "notice-group-start");
    await withObsidianPage(port, async (page) => {
      const notice = page.locator(".notice:has(.vpk-keyed-notice-group)");
      await notice
        .getByText("Checking for incomplete documents...", { exact: true })
        .click();
      await notice.waitFor({ state: "hidden", timeout: 5_000 });
    });
    await executeHarnessStory(session, "notice-group-result");
    await withObsidianPage(port, async (page) => {
      const notice = page.locator(".notice:has(.vpk-keyed-notice-group)");
      const rows = notice.locator(".vpk-keyed-notice-group__item");
      if ((await rows.count()) !== 1)
        throw new Error(
          "A dismissed grouped Notice repeated acknowledged rows",
        );
      await rows
        .getByText("No size mismatches found", { exact: true })
        .waitFor();
      await notice
        .getByRole("button", { name: "Dismiss this notification" })
        .click();
      await notice.waitFor({ state: "hidden", timeout: 5_000 });
    });

    console.log("Real Obsidian keyed and grouped Notice stories passed.");
  } finally {
    if (testSession !== undefined) await stopHarnessTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
