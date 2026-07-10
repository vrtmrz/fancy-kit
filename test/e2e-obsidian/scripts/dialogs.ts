import type { Page } from "playwright";
import { withObsidianPage } from "@vrtmrz/obsidian-test-session";
import {
  executeShowcaseStory,
  startShowcaseTestSession,
  stopShowcaseTestSession,
  waitForShowcaseState,
  type ShowcaseTestSession,
} from "../runner/showcase.ts";

async function activeModal(page: Page, title: string) {
  const modal = page
    .locator(".modal-container .modal")
    .filter({ hasText: title })
    .last();
  await modal.waitFor({ state: "visible", timeout: 10_000 });
  return modal;
}

async function main(): Promise<void> {
  let testSession: ShowcaseTestSession | undefined;
  try {
    testSession = await startShowcaseTestSession();
    const { session } = testSession;
    const port = session.remoteDebuggingPort;

    await executeShowcaseStory(session, "prompt-text");
    await withObsidianPage(port, async (page) => {
      const modal = await activeModal(page, "Device name");
      const input = modal.locator('input[type="text"]');
      await input.fill("e2e-device");
      await modal.getByRole("button", { name: "OK", exact: true }).click();
    });
    await waitForShowcaseState(
      session,
      (state) => state.lastResult === "e2e-device",
      "text prompt result",
    );

    await executeShowcaseStory(session, "prompt-text");
    await withObsidianPage(port, async (page) => {
      await activeModal(page, "Device name");
      await page.keyboard.press("Escape");
    });
    await waitForShowcaseState(
      session,
      (state) => state.lastStory === "prompt-text" && state.lastResult === null,
      "prompt cancellation",
    );

    await executeShowcaseStory(session, "prompt-password");
    await withObsidianPage(port, async (page) => {
      const modal = await activeModal(page, "Passphrase");
      const input = modal.locator('input[type="password"]');
      await input.fill("test-secret");
      await modal.getByRole("button", { name: "OK", exact: true }).click();
    });
    await waitForShowcaseState(
      session,
      (state) => state.lastResult === "test-secret",
      "password result",
    );

    await executeShowcaseStory(session, "pick-one");
    await withObsidianPage(port, async (page) => {
      const prompt = page.locator(".prompt").last();
      await prompt.waitFor({ state: "visible", timeout: 10_000 });
      await prompt.getByText("Targets/beta.md", { exact: true }).waitFor();
      await prompt.getByText("Beta", { exact: true }).click();
    });
    await waitForShowcaseState(
      session,
      (state) => (state.lastResult as { id?: string } | null)?.id === "beta",
      "typed selection result",
    );

    await executeShowcaseStory(session, "confirm-action");
    await withObsidianPage(port, async (page) => {
      const modal = await activeModal(page, "Restore confirmation");
      await modal.getByRole("button", { name: "Restore", exact: true }).click();
    });
    await waitForShowcaseState(
      session,
      (state) => state.lastResult === "restore",
      "confirmation result",
    );

    await executeShowcaseStory(session, "show-message");
    await withObsidianPage(port, async (page) => {
      const modal = await activeModal(page, "Information");
      await modal.getByRole("button", { name: "OK", exact: true }).click();
    });
    await waitForShowcaseState(
      session,
      (state) => state.lastResult === "closed",
      "message close result",
    );

    console.log("Real Obsidian dialog stories passed.");
  } finally {
    if (testSession !== undefined) await stopShowcaseTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
