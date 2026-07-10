import type { JSHandle, Locator, Page } from "playwright";
import {
  waitForObsidianPageUiIdle,
  withObsidianPage,
} from "@vrtmrz/obsidian-test-session";
import {
  startShowcaseTestSession,
  stopShowcaseTestSession,
  type ShowcaseState,
  type ShowcaseTestSession,
} from "../runner/showcase.ts";

const MOBILE_VIEWPORT = { width: 375, height: 667 } as const;
const SHOWCASE_PLUGIN_ID = "vpk-showcase";

interface ObsidianTestApp {
  emulateMobile(enabled: boolean): void;
  plugins?: { plugins: Record<string, ShowcaseTestPlugin | undefined> };
}

type ObsidianTestWindow = Window & typeof globalThis & { app: ObsidianTestApp };

interface ShowcaseTestPlugin {
  e2e: ShowcaseState;
  runStory(story: string): Promise<void>;
}

async function setMobileEmulation(page: Page, enabled: boolean): Promise<void> {
  await page.evaluate((nextEnabled) => {
    const obsidianApp = (window as unknown as ObsidianTestWindow).app;
    if (typeof obsidianApp?.emulateMobile !== "function") {
      throw new Error("app.emulateMobile is unavailable");
    }
    obsidianApp.emulateMobile(nextEnabled);
  }, enabled);
}

async function getShowcasePlugin(
  page: Page,
): Promise<JSHandle<ShowcaseTestPlugin>> {
  return await page.evaluateHandle((pluginId) => {
    const plugin = (window as unknown as ObsidianTestWindow).app.plugins
      ?.plugins[pluginId];
    if (plugin === undefined)
      throw new Error(`Showcase plugin is not loaded: ${pluginId}`);
    return plugin;
  }, SHOWCASE_PLUGIN_ID);
}

async function executeShowcaseStory(
  plugin: JSHandle<ShowcaseTestPlugin>,
  story: string,
): Promise<void> {
  await plugin.evaluate((instance, storyId) => {
    void instance.runStory(storyId);
  }, story);
}

async function readShowcaseState(
  plugin: JSHandle<ShowcaseTestPlugin>,
): Promise<ShowcaseState> {
  return await plugin.evaluate((instance) => instance.e2e);
}

async function waitForShowcaseState(
  plugin: JSHandle<ShowcaseTestPlugin>,
  predicate: (state: ShowcaseState) => boolean,
  description: string,
  timeoutMs = Number(process.env.E2E_OBSIDIAN_STORY_TIMEOUT_MS ?? 10_000),
): Promise<ShowcaseState> {
  const deadline = Date.now() + timeoutMs;
  let state: ShowcaseState | undefined;
  while (Date.now() < deadline) {
    state = await readShowcaseState(plugin);
    if (predicate(state)) return state;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Timed out waiting for ${description}. Last state: ${JSON.stringify(state)}`,
  );
}

async function activeModal(page: Page, title: string): Promise<Locator> {
  const modal = page
    .locator(".modal-container .modal")
    .filter({ hasText: title })
    .last();
  await modal.waitFor({ state: "visible", timeout: 10_000 });
  return modal;
}

async function assertFitsViewport(
  page: Page,
  element: Locator,
  description: string,
): Promise<void> {
  const viewport = page.viewportSize();
  if (viewport === null)
    throw new Error("Mobile viewport emulation is not active");

  const tolerance = 1;
  const deadline = Date.now() + 3_000;
  let box = await element.boundingBox();
  while (
    box !== null &&
    (box.x < -tolerance ||
      box.y < -tolerance ||
      box.x + box.width > viewport.width + tolerance ||
      box.y + box.height > viewport.height + tolerance) &&
    Date.now() < deadline
  ) {
    await page.waitForTimeout(50);
    box = await element.boundingBox();
  }

  if (box === null)
    throw new Error(`${description} has no visible bounding box`);
  if (
    box.x < -tolerance ||
    box.y < -tolerance ||
    box.x + box.width > viewport.width + tolerance ||
    box.y + box.height > viewport.height + tolerance
  ) {
    throw new Error(
      `${description} exceeds ${viewport.width}x${viewport.height}: ${JSON.stringify(box)}`,
    );
  }

  const widths = await element.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
  }));
  if (widths.scrollWidth > widths.clientWidth + tolerance) {
    throw new Error(
      `${description} overflows horizontally: ${JSON.stringify(widths)}`,
    );
  }
}

async function main(): Promise<void> {
  let testSession: ShowcaseTestSession | undefined;
  try {
    testSession = await startShowcaseTestSession();
    const port = testSession.session.remoteDebuggingPort;

    await withObsidianPage(port, async (page) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await setMobileEmulation(page, true);
      try {
        await page.waitForFunction((pluginId) => {
          const obsidianApp = (window as unknown as ObsidianTestWindow).app;
          const showcaseLoaded =
            obsidianApp?.plugins?.plugins[pluginId] !== undefined;
          return (
            document.body.classList.contains("is-mobile") && showcaseLoaded
          );
        }, SHOWCASE_PLUGIN_ID);
        await waitForObsidianPageUiIdle(page);
        const showcasePlugin = await getShowcasePlugin(page);
        try {
          await executeShowcaseStory(showcasePlugin, "prompt-text");
          const textModal = await activeModal(page, "Device name");
          await assertFitsViewport(page, textModal, "text prompt");
          const textInput = textModal.locator('input[type="text"]');
          await textInput.fill("mobile-device");
          await textInput.press("Enter");
          await waitForShowcaseState(
            showcasePlugin,
            (state) => state.lastResult === "mobile-device",
            "mobile text prompt result",
          );

          await executeShowcaseStory(showcasePlugin, "prompt-text");
          await activeModal(page, "Device name");
          await page.keyboard.press("Escape");
          await waitForShowcaseState(
            showcasePlugin,
            (state) =>
              state.lastStory === "prompt-text" && state.lastResult === null,
            "mobile prompt cancellation",
          );

          await executeShowcaseStory(showcasePlugin, "pick-one");
          const prompt = page.locator(".prompt").last();
          await prompt.waitFor({ state: "visible", timeout: 10_000 });
          await assertFitsViewport(page, prompt, "typed selector");
          const promptInput = prompt.locator(".prompt-input");
          await promptInput.fill("be");
          await prompt
            .locator(".suggestion-item")
            .filter({ hasText: "Beta" })
            .filter({ hasText: "Targets/beta.md" })
            .waitFor();
          await promptInput.press("Enter");
          await waitForShowcaseState(
            showcasePlugin,
            (state) =>
              (state.lastResult as { id?: string } | null)?.id === "beta",
            "mobile keyboard selection result",
          );

          await executeShowcaseStory(showcasePlugin, "confirm-action");
          const confirmation = await activeModal(page, "Restore confirmation");
          await assertFitsViewport(page, confirmation, "confirmation dialog");
          await confirmation
            .getByRole("button", { name: "Restore", exact: true })
            .click();
          await waitForShowcaseState(
            showcasePlugin,
            (state) => state.lastResult === "restore",
            "mobile confirmation result",
          );

          await executeShowcaseStory(showcasePlugin, "progress-start");
          const progressNotice = page
            .locator(".notice:has(.vpk-progress-notice)")
            .last();
          await progressNotice.waitFor({ state: "visible", timeout: 10_000 });
          await assertFitsViewport(page, progressNotice, "progress Notice");
          await progressNotice.getByText("0 / 3", { exact: true }).waitFor();

          await executeShowcaseStory(showcasePlugin, "progress-step");
          await progressNotice.getByText("1 / 3", { exact: true }).waitFor();
          await assertFitsViewport(
            page,
            progressNotice,
            "updated progress Notice",
          );

          await executeShowcaseStory(showcasePlugin, "progress-cancel");
          await waitForShowcaseState(
            showcasePlugin,
            (state) => state.progressState === "cancelled",
            "mobile cancelled progress state",
          );
          await progressNotice.waitFor({ state: "hidden", timeout: 5_000 });
        } finally {
          await showcasePlugin.dispose();
        }
      } finally {
        await setMobileEmulation(page, false);
      }
    });

    console.log("Real Obsidian mobile-emulation stories passed.");
  } finally {
    if (testSession !== undefined) await stopShowcaseTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
