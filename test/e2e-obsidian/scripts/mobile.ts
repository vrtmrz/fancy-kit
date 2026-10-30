import { mkdir } from "node:fs/promises";
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

async function assertKeyboardBounds(
  page: Page,
  modal: Locator,
  label: string,
  keyboardRatio = 0.42,
): Promise<void> {
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error("The mobile viewport is unavailable.");
  const original = await page.evaluate(() => ({
    value: document.body.style.getPropertyValue("--keyboard-height"),
    priority: document.body.style.getPropertyPriority("--keyboard-height"),
    bottom: document.body.style.getPropertyValue("--safe-area-inset-bottom"),
    bottomPriority: document.body.style.getPropertyPriority(
      "--safe-area-inset-bottom",
    ),
  }));
  const focusedHandle = await modal.evaluateHandle((element) =>
    element.contains(document.activeElement) ? document.activeElement : null,
  );
  const focused = focusedHandle.asElement();
  const keyboardHeight = Math.round(viewport.height * keyboardRatio);
  let baseline:
    { top: number; bottom: number; padding: string | undefined } | undefined;
  let overlay: typeof baseline;
  const screenshotDirectory = process.env.E2E_OBSIDIAN_KEYBOARD_SCREENSHOT_DIR;
  if (screenshotDirectory)
    await mkdir(screenshotDirectory, { recursive: true });
  try {
    for (const mode of [
      "closed",
      "overlay",
      "resized",
      "overlay-with-shared-inset",
      "restored",
    ] as const) {
      const overlayHeight =
        mode === "overlay" || mode === "overlay-with-shared-inset"
          ? keyboardHeight
          : 0;
      await page.evaluate(
        ({ height, bottom, bottomPriority, shared }) => {
          document.body.style.setProperty("--keyboard-height", `${height}px`);
          if (shared)
            document.body.style.setProperty(
              "--safe-area-inset-bottom",
              `${height}px`,
            );
          else if (bottom === "")
            document.body.style.removeProperty("--safe-area-inset-bottom");
          else
            document.body.style.setProperty(
              "--safe-area-inset-bottom",
              bottom,
              bottomPriority,
            );
        },
        {
          height: overlayHeight,
          bottom: original.bottom,
          bottomPriority: original.bottomPriority,
          shared: mode === "overlay-with-shared-inset",
        },
      );
      await page.setViewportSize({
        width: viewport.width,
        height:
          mode === "resized"
            ? viewport.height - keyboardHeight
            : viewport.height,
      });
      await page.waitForTimeout(350);
      const bounds = await modal.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const content = element.querySelector(".modal-content");
        const style = content === null ? null : getComputedStyle(content);
        return {
          top: rect.top,
          bottom: rect.bottom,
          padding: style?.padding,
          controls: Array.from(element.querySelectorAll("button, input"))
            .filter((control) => control.getClientRects().length > 0)
            .map((control) => {
              const box = control.getBoundingClientRect();
              return { top: box.top, bottom: box.bottom };
            }),
        };
      });
      baseline ??= bounds;
      if (mode === "overlay") overlay = bounds;
      if (
        mode === "overlay-with-shared-inset" &&
        overlay !== undefined &&
        (Math.abs(bounds.top - overlay.top) > 1 ||
          Math.abs(bounds.bottom - overlay.bottom) > 1)
      ) {
        throw new Error(
          `Expected ${label} to reserve the overlapping keyboard and safe area once: ${JSON.stringify({ overlay, bounds })}`,
        );
      }
      if (
        bounds.padding !== baseline.padding ||
        (mode === "restored" &&
          (Math.abs(bounds.top - baseline.top) > 1 ||
            Math.abs(bounds.bottom - baseline.bottom) > 1))
      ) {
        throw new Error(
          `Expected ${label} (${mode}) to preserve content padding and restore its frame: ${JSON.stringify({ baseline, bounds })}`,
        );
      }
      const availableBottom =
        viewport.height -
        (mode === "overlay" ||
        mode === "resized" ||
        mode === "overlay-with-shared-inset"
          ? keyboardHeight
          : 0);
      console.log(
        JSON.stringify({
          event: "mobile-keyboard-bounds",
          label,
          mode,
          availableBottom,
          bounds,
        }),
      );
      if (screenshotDirectory)
        await page.screenshot({
          path: `${screenshotDirectory}/${label.replace(/[^a-z0-9]+/gi, "-")}-${mode}.png`,
          animations: "disabled",
        });
      if (bounds.top < -1 || bounds.bottom > availableBottom + 1) {
        throw new Error(
          `Expected ${label} (${mode}) to fit above the keyboard: ${JSON.stringify({ availableBottom, bounds })}`,
        );
      }
      for (const control of bounds.controls) {
        if (
          control.top < bounds.top - 1 ||
          control.bottom > Math.min(bounds.bottom, availableBottom) + 1
        ) {
          throw new Error(
            `Expected ${label} (${mode}) controls to remain above the keyboard: ${JSON.stringify(control)}`,
          );
        }
      }
      if (
        focused &&
        !(await focused.evaluate(
          (element) => element === document.activeElement,
        ))
      ) {
        throw new Error(
          `Expected ${label} (${mode}) to retain keyboard focus.`,
        );
      }
    }
  } finally {
    await page.setViewportSize(viewport);
    await page.evaluate(({ value, priority, bottom, bottomPriority }) => {
      if (bottom === "")
        document.body.style.removeProperty("--safe-area-inset-bottom");
      else
        document.body.style.setProperty(
          "--safe-area-inset-bottom",
          bottom,
          bottomPriority,
        );
      if (value === "") document.body.style.removeProperty("--keyboard-height");
      else
        document.body.style.setProperty("--keyboard-height", value, priority);
    }, original);
    await focusedHandle.dispose();
  }
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
  const closeButton = modal.locator(
    ".modal-close-button, .modal-header-button",
  );
  await assertLocatorWithinSafeArea(page, closeButton, {
    label: `${description} close button`,
  });
  await assertLocatorHasMinimumTouchTarget(page, closeButton, {
    label: `${description} close button`,
  });
  const buttons = modal.getByRole("button");
  const buttonCount = await buttons.count();
  for (let index = 0; index < buttonCount; index += 1) {
    const button = buttons.nth(index);
    if (!(await button.isVisible())) continue;
    const label = (await button.textContent())?.trim() || `button ${index + 1}`;
    await assertLocatorWithinViewport(page, button, {
      label: `${description}: ${label}`,
    });
    await assertLocatorWithinSafeArea(page, button, {
      label: `${description}: ${label}`,
    });
    await assertNoHorizontalOverflow(page, button, {
      label: `${description}: ${label}`,
    });
    await assertLocatorHasMinimumTouchTarget(page, button, {
      label: `${description}: ${label}`,
    });
  }
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
          const nativeContentPadding = await textModal
            .locator(".modal-content")
            .evaluate((element) => {
              const style = getComputedStyle(element);
              return { left: style.paddingLeft, right: style.paddingRight };
            });
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
          await assertKeyboardBounds(page, textModal, "text prompt");
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

          await executeHarnessStory(harnessPlugin, "prompt-password");
          const passwordModal = await activeModal(page, "Passphrase");
          await passwordModal
            .locator('input[type="password"]')
            .fill("mobile-passphrase");
          await assertKeyboardBounds(page, passwordModal, "password prompt");
          try {
            await page.evaluate(() =>
              document.body.style.setProperty(
                "--keyboard-height",
                `${Math.round(innerHeight * 0.42)}px`,
              ),
            );
            await passwordModal
              .getByRole("button", { name: "OK", exact: true })
              .click();
          } finally {
            await page.evaluate(() =>
              document.body.style.removeProperty("--keyboard-height"),
            );
          }
          await waitForHarnessState(
            harnessPlugin,
            (state) =>
              state.lastStory === "prompt-password" &&
              state.lastResult === "password-entered",
            "mobile password submission",
          );

          await executeHarnessStory(harnessPlugin, "pick-one");
          const prompt = page.locator(".prompt").last();
          await prompt.waitFor({ state: "visible", timeout: 10_000 });
          await assertFitsViewport(page, prompt, "typed selector");
          const promptInput = prompt.locator(".prompt-input");
          await promptInput.fill("be");
          await assertKeyboardBounds(page, prompt, "typed selector");
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
          const confirmationPadding = await confirmation
            .locator(".modal-content")
            .evaluate((element) => {
              const style = getComputedStyle(element);
              return { left: style.paddingLeft, right: style.paddingRight };
            });
          console.log(
            JSON.stringify({
              event: "mobile-content-padding",
              nativeContentPadding,
              confirmationPadding,
            }),
          );
          if (
            confirmationPadding.left !== nativeContentPadding.left ||
            confirmationPadding.right !== nativeContentPadding.right
          ) {
            throw new Error(
              `Expected confirmation content to retain the host padding: ${JSON.stringify({ nativeContentPadding, confirmationPadding })}`,
            );
          }
          await assertFitsMobileModal(
            page,
            confirmation,
            "confirmation dialog",
          );
          await confirmation
            .getByRole("button", { name: "Restore", exact: true })
            .focus();
          await assertKeyboardBounds(page, confirmation, "confirmation");
          await confirmation
            .getByRole("button", { name: "Restore", exact: true })
            .click();
          await waitForHarnessState(
            harnessPlugin,
            (state) => state.lastResult === "restore",
            "mobile confirmation result",
          );

          await executeHarnessStory(harnessPlugin, "confirm-action-long");
          const longConfirmation = await activeModal(
            page,
            "Compatibility review",
          );
          await assertFitsMobileModal(
            page,
            longConfirmation,
            "long confirmation dialog",
          );
          await longConfirmation
            .locator(".vpk-action-dialog__actions button")
            .first()
            .focus();
          await assertKeyboardBounds(
            page,
            longConfirmation,
            "long confirmation",
            0.25,
          );
          const longActions = longConfirmation.locator(
            ".vpk-action-dialog__actions--vertical",
          );
          await longActions.waitFor({ state: "visible", timeout: 10_000 });
          const longActionDirection = await longActions.evaluate(
            (element) => getComputedStyle(element).flexDirection,
          );
          if (longActionDirection !== "column") {
            throw new Error(
              `Expected vertically stacked mobile actions, received ${longActionDirection}.`,
            );
          }
          const longDialogScreenshot =
            process.env.E2E_OBSIDIAN_LONG_DIALOG_SCREENSHOT;
          if (
            longDialogScreenshot !== undefined &&
            longDialogScreenshot !== ""
          ) {
            await page.screenshot({
              path: longDialogScreenshot,
              animations: "disabled",
            });
          }
          await longConfirmation
            .getByRole("button", {
              name: /Resume synchronisation$/,
            })
            .click();
          await waitForHarnessState(
            harnessPlugin,
            (state) => state.lastResult === "resume",
            "mobile long confirmation result",
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

          await executeHarnessStory(harnessPlugin, "notice-group-start");
          await executeHarnessStory(harnessPlugin, "notice-group-result");
          const groupedNotice = page
            .locator(".notice:has(.vpk-keyed-notice-group)")
            .last();
          await groupedNotice.waitFor({ state: "visible", timeout: 10_000 });
          await assertFitsViewport(page, groupedNotice, "grouped Notice");
          await assertLocatorWithinSafeArea(page, groupedNotice, {
            label: "grouped Notice",
          });
          const groupedAction = groupedNotice.getByRole("button", {
            name: "Dismiss this notification",
          });
          await assertLocatorWithinSafeArea(page, groupedAction, {
            label: "grouped Notice action",
          });
          await assertLocatorHasMinimumTouchTarget(page, groupedAction, {
            label: "grouped Notice action",
          });
          const groupedNoticeScreenshot =
            process.env.E2E_OBSIDIAN_GROUPED_NOTICE_SCREENSHOT;
          if (
            groupedNoticeScreenshot !== undefined &&
            groupedNoticeScreenshot !== ""
          ) {
            await page.screenshot({
              path: groupedNoticeScreenshot,
              animations: "disabled",
            });
          }
          await groupedAction.click();
          await waitForHarnessState(
            harnessPlugin,
            (state) => state.lastResult === "notice-group-dismissed",
            "mobile grouped Notice action",
          );
          await groupedNotice.waitFor({ state: "hidden", timeout: 5_000 });
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
