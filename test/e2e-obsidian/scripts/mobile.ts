import type { JSHandle, Locator, Page } from "playwright";
import {
  assertLocatorHasMinimumTouchTarget,
  assertLocatorWithinSafeArea,
  assertLocatorWithinViewport,
  assertNoHorizontalOverflow,
  waitForObsidianPageUiIdle,
  withObsidianPage,
} from "@vrtmrz/obsidian-test-session";
import {
  startHarnessTestSession,
  stopHarnessTestSession,
  type HarnessState,
  type HarnessTestSession,
} from "../runner/harness.ts";

const MOBILE_VIEWPORT = { width: 375, height: 667 } as const;
const IPHONE_SAFE_AREA = { top: 47, right: 0, bottom: 34, left: 0 } as const;
const HARNESS_PLUGIN_ID = "fancy-kit-harness";

interface ObsidianTestApp {
  emulateMobile(enabled: boolean): void;
  plugins?: { plugins: Record<string, HarnessTestPlugin | undefined> };
}

type ObsidianTestWindow = Window & typeof globalThis & { app: ObsidianTestApp };

interface HarnessTestPlugin {
  e2e: HarnessState;
  openHarness(): Promise<void>;
  runStory(story: string): Promise<void>;
  beginGuidedReview(): void;
  setDurationSeconds(value: string): void;
  startGuidedTimedTest(): Promise<void>;
  recordDisplayResult(result: "yes" | "no" | "unsure"): void;
  startReleasedDisplayTest(): void;
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

async function setSafeAreaSimulation(
  page: Page,
  insets: typeof IPHONE_SAFE_AREA | null,
): Promise<void> {
  await page.evaluate((nextInsets) => {
    const properties = ["top", "right", "bottom", "left"] as const;
    for (const edge of properties) {
      const property = `--safe-area-inset-${edge}`;
      if (nextInsets === null) document.body.style.removeProperty(property);
      else document.body.style.setProperty(property, `${nextInsets[edge]}px`);
    }
  }, insets);
}

async function getHarnessPlugin(
  page: Page,
): Promise<JSHandle<HarnessTestPlugin>> {
  return await page.evaluateHandle((pluginId) => {
    const plugin = (window as unknown as ObsidianTestWindow).app.plugins
      ?.plugins[pluginId];
    if (plugin === undefined)
      throw new Error(`Harness plug-in is not loaded: ${pluginId}`);
    return plugin;
  }, HARNESS_PLUGIN_ID);
}

async function executeHarnessStory(
  plugin: JSHandle<HarnessTestPlugin>,
  story: string,
): Promise<void> {
  await plugin.evaluate((instance, storyId) => {
    void instance.runStory(storyId);
  }, story);
}

async function readHarnessState(
  plugin: JSHandle<HarnessTestPlugin>,
): Promise<HarnessState> {
  return await plugin.evaluate((instance) => instance.e2e);
}

async function waitForHarnessState(
  plugin: JSHandle<HarnessTestPlugin>,
  predicate: (state: HarnessState) => boolean,
  description: string,
  timeoutMs = Number(process.env.E2E_OBSIDIAN_STORY_TIMEOUT_MS ?? 10_000),
): Promise<HarnessState> {
  const deadline = Date.now() + timeoutMs;
  let state: HarnessState | undefined;
  while (Date.now() < deadline) {
    state = await readHarnessState(plugin);
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
  await assertLocatorWithinViewport(page, element, { label: description });
  await assertNoHorizontalOverflow(page, element, { label: description });
}

async function assertFitsMobileModal(
  page: Page,
  modal: Locator,
  description: string,
): Promise<void> {
  await assertFitsViewport(page, modal, description);
  await assertLocatorWithinSafeArea(page, modal, { label: description });
  const closeButton = modal.locator(".modal-close-button");
  await assertLocatorWithinSafeArea(page, closeButton, {
    label: `${description} close button`,
  });
  await assertLocatorHasMinimumTouchTarget(page, closeButton, {
    label: `${description} close button`,
  });
}

async function main(): Promise<void> {
  let testSession: HarnessTestSession | undefined;
  try {
    testSession = await startHarnessTestSession();
    const port = testSession.session.remoteDebuggingPort;

    await withObsidianPage(port, async (page) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await setMobileEmulation(page, true);
      try {
        await page.waitForFunction((pluginId) => {
          const obsidianApp = (window as unknown as ObsidianTestWindow).app;
          const harnessLoaded =
            obsidianApp?.plugins?.plugins[pluginId] !== undefined;
          return document.body.classList.contains("is-mobile") && harnessLoaded;
        }, HARNESS_PLUGIN_ID);
        await setSafeAreaSimulation(page, IPHONE_SAFE_AREA);
        await waitForObsidianPageUiIdle(page);
        const harnessPlugin = await getHarnessPlugin(page);
        try {
          await harnessPlugin.evaluate(async (instance) => {
            await instance.openHarness();
          });
          const scenarioRunner = page.locator(
            '[data-testid="scenario-runner"]',
          );
          await scenarioRunner.waitFor({ state: "visible", timeout: 10_000 });
          const scenarioActions = scenarioRunner.locator(".setting-item", {
            has: page.locator('[data-testid="scenario-run-selected"]'),
          });
          await scenarioActions.scrollIntoViewIfNeeded();
          await assertFitsViewport(
            page,
            scenarioActions,
            "scenario runner actions",
          );

          await harnessPlugin.evaluate(async (instance) => {
            instance.beginGuidedReview();
            instance.setDurationSeconds("1");
            await instance.startGuidedTimedTest();
            instance.recordDisplayResult("yes");
            instance.startReleasedDisplayTest();
          });
          const releasedDisplayActions = page
            .locator('[data-testid="guided-review"]')
            .locator(".fancy-kit-harness__guided-actions");
          await releasedDisplayActions.scrollIntoViewIfNeeded();
          await assertFitsViewport(
            page,
            releasedDisplayActions,
            "post-release result actions",
          );

          await executeHarnessStory(harnessPlugin, "prompt-text");
          const textModal = await activeModal(page, "Device name");
          const screenshotPath = process.env.E2E_OBSIDIAN_MOBILE_SCREENSHOT;
          if (screenshotPath !== undefined && screenshotPath !== "") {
            await page.screenshot({
              path: screenshotPath,
              animations: "disabled",
            });
          }
          await assertFitsMobileModal(page, textModal, "text prompt");
          const textModalInspection = await assertLocatorWithinSafeArea(
            page,
            textModal,
            {
              label: "text prompt",
            },
          );
          if (
            textModalInspection.safeAreaInsets.top !== IPHONE_SAFE_AREA.top ||
            textModalInspection.safeAreaInsets.bottom !==
              IPHONE_SAFE_AREA.bottom
          ) {
            throw new Error(
              `Simulated iPhone safe-area insets were not measured: ${JSON.stringify(textModalInspection.safeAreaInsets)}`,
            );
          }
          const textInput = textModal.locator('input[type="text"]');
          await textInput.fill("mobile-device");
          await textInput.press("Enter");
          await waitForHarnessState(
            harnessPlugin,
            (state) => state.lastResult === "mobile-device",
            "mobile text prompt result",
          );

          await executeHarnessStory(harnessPlugin, "prompt-text");
          await activeModal(page, "Device name");
          await page.keyboard.press("Escape");
          await waitForHarnessState(
            harnessPlugin,
            (state) =>
              state.lastStory === "prompt-text" && state.lastResult === null,
            "mobile prompt cancellation",
          );

          await executeHarnessStory(harnessPlugin, "pick-one");
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
          await waitForHarnessState(
            harnessPlugin,
            (state) =>
              (state.lastResult as { id?: string } | null)?.id === "beta",
            "mobile keyboard selection result",
          );

          await executeHarnessStory(harnessPlugin, "confirm-action");
          const confirmation = await activeModal(page, "Restore confirmation");
          await assertFitsMobileModal(
            page,
            confirmation,
            "confirmation dialog",
          );
          await confirmation
            .getByRole("button", { name: "Restore", exact: true })
            .click();
          await waitForHarnessState(
            harnessPlugin,
            (state) => state.lastResult === "restore",
            "mobile confirmation result",
          );

          await executeHarnessStory(harnessPlugin, "show-message");
          const message = await activeModal(page, "Information");
          await assertFitsMobileModal(page, message, "message dialog");
          await message
            .getByRole("button", { name: "OK", exact: true })
            .click();
          await waitForHarnessState(
            harnessPlugin,
            (state) => state.lastResult === "closed",
            "mobile message result",
          );

          await executeHarnessStory(harnessPlugin, "progress-start");
          const progressNotice = page
            .locator(".notice:has(.vpk-progress-notice)")
            .last();
          await progressNotice.waitFor({ state: "visible", timeout: 10_000 });
          await assertFitsViewport(page, progressNotice, "progress Notice");
          await progressNotice.getByText("0 / 3", { exact: true }).waitFor();

          await executeHarnessStory(harnessPlugin, "progress-step");
          await progressNotice.getByText("1 / 3", { exact: true }).waitFor();
          await assertFitsViewport(
            page,
            progressNotice,
            "updated progress Notice",
          );

          await executeHarnessStory(harnessPlugin, "progress-cancel");
          await waitForHarnessState(
            harnessPlugin,
            (state) => state.progressState === "cancelled",
            "mobile cancelled progress state",
          );
          await progressNotice.waitFor({ state: "hidden", timeout: 5_000 });
        } finally {
          await harnessPlugin.dispose();
        }
      } finally {
        await setSafeAreaSimulation(page, null);
        await setMobileEmulation(page, false);
      }
    });

    console.log("Real Obsidian mobile-emulation stories passed.");
  } finally {
    if (testSession !== undefined) await stopHarnessTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
