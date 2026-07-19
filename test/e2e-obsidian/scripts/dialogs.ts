import type { Page } from "playwright";
import { withObsidianPage } from "@vrtmrz/obsidian-test-session";
import {
  executeHarnessStory,
  startHarnessTestSession,
  stopHarnessTestSession,
  waitForHarnessState,
  type HarnessTestSession,
} from "../runner/harness.ts";

async function activeModal(page: Page, title: string) {
  const modal = page
    .locator(".modal-container .modal")
    .filter({ hasText: title })
    .last();
  await modal.waitFor({ state: "visible", timeout: 10_000 });
  return modal;
}

async function main(): Promise<void> {
  let testSession: HarnessTestSession | undefined;
  try {
    testSession = await startHarnessTestSession();
    const { session } = testSession;
    const port = session.remoteDebuggingPort;

    await executeHarnessStory(session, "prompt-text");
    await withObsidianPage(port, async (page) => {
      const modal = await activeModal(page, "Device name");
      const input = modal.locator('input[type="text"]');
      await input.fill("e2e-device");
      await modal.getByRole("button", { name: "OK", exact: true }).click();
    });
    await waitForHarnessState(
      session,
      (state) => state.lastResult === "e2e-device",
      "text prompt result",
    );

    await executeHarnessStory(session, "prompt-text");
    await withObsidianPage(port, async (page) => {
      await activeModal(page, "Device name");
      await page.keyboard.press("Escape");
    });
    await waitForHarnessState(
      session,
      (state) => state.lastStory === "prompt-text" && state.lastResult === null,
      "prompt cancellation",
    );

    await executeHarnessStory(session, "prompt-password");
    await withObsidianPage(port, async (page) => {
      const modal = await activeModal(page, "Passphrase");
      const input = modal.locator('input[type="password"]');
      await input.fill("test-secret");
      await modal.getByRole("button", { name: "OK", exact: true }).click();
    });
    await waitForHarnessState(
      session,
      (state) => state.lastResult === "password-entered",
      "redacted password result",
    );

    await executeHarnessStory(session, "pick-one");
    await withObsidianPage(port, async (page) => {
      const prompt = page.locator(".prompt").last();
      await prompt.waitFor({ state: "visible", timeout: 10_000 });
      const betaItem = prompt
        .locator(".suggestion-item")
        .filter({ hasText: "Beta" })
        .filter({ hasText: "Targets/beta.md" });
      await betaItem.waitFor();
      await betaItem.click();
    });
    await waitForHarnessState(
      session,
      (state) => (state.lastResult as { id?: string } | null)?.id === "beta",
      "typed selection result",
    );

    await executeHarnessStory(session, "confirm-action");
    await withObsidianPage(port, async (page) => {
      const modal = await activeModal(page, "Restore confirmation");
      await modal.getByRole("button", { name: "Restore", exact: true }).click();
    });
    await waitForHarnessState(
      session,
      (state) => state.lastResult === "restore",
      "confirmation result",
    );

    await executeHarnessStory(session, "show-message");
    await withObsidianPage(port, async (page) => {
      const modal = await activeModal(page, "Information");
      await modal.getByRole("button", { name: "OK", exact: true }).click();
    });
    await waitForHarnessState(
      session,
      (state) => state.lastResult === "closed",
      "message close result",
    );

    await executeHarnessStory(session, "confirm-action-long");
    await withObsidianPage(port, async (page) => {
      const modal = await activeModal(page, "Compatibility review");
      const actions = modal.locator(".vpk-action-dialog__actions--vertical");
      await actions.waitFor({ state: "visible", timeout: 10_000 });
      const flexDirection = await actions.evaluate(
        (element) => getComputedStyle(element).flexDirection,
      );
      if (flexDirection !== "column") {
        throw new Error(
          `Expected vertically stacked compatibility actions, received ${flexDirection}.`,
        );
      }
      await page.evaluate(async (pluginId) => {
        const obsidianApp = (
          window as unknown as {
            app: {
              plugins: { disablePlugin(id: string): Promise<void> };
            };
          }
        ).app;
        await obsidianApp.plugins.disablePlugin(pluginId);
      }, "fancy-kit-harness");
      await modal.waitFor({ state: "hidden", timeout: 10_000 });
    });

    console.log("Real Obsidian dialog stories passed.");
  } finally {
    if (testSession !== undefined) await stopHarnessTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
