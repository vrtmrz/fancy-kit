import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Locator, Page } from "playwright";
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

async function measureActionFocus(modal: Locator) {
  const measurements = [];
  for (const button of await modal.locator(".vpk-action-dialog__action").all()) {
    await button.focus();
    await modal.page().keyboard.press("Shift");
    measurements.push(
      await button.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const clips = [];
        let parent = element.parentElement;
        while (parent) {
          const style = getComputedStyle(parent);
          const bounds = parent.getBoundingClientRect();
          if (style.overflowX !== "visible" || style.overflowY !== "visible") {
            clips.push({
              classes: parent.className,
              x: style.overflowX !== "visible",
              y: style.overflowY !== "visible",
              left: bounds.left + parent.clientLeft,
              right: bounds.left + parent.clientLeft + parent.clientWidth,
              top: bounds.top + parent.clientTop,
              bottom: bounds.top + parent.clientTop + parent.clientHeight,
            });
          }
          parent = parent.parentElement;
        }
        return {
          text: element.textContent,
          focusVisible: element.matches(":focus-visible"),
          shadow: getComputedStyle(element).boxShadow,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          clips,
        };
      }),
    );
  }
  return measurements;
}

async function checkLongMessageScroll(
  modal: Locator,
  name: string,
): Promise<void> {
  const inspection = await modal.evaluate((element) => {
    const message = element.querySelector(".vpk-action-dialog__message")!;
    message.replaceChildren(
      ...Array.from({ length: 40 }, (_, index) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = `Paragraph ${index + 1}: Review the release notes before resuming synchronisation.`;
        return paragraph;
      }),
    );
    const actions = element.querySelector(".vpk-action-dialog__actions")!;
    const before = actions.getBoundingClientRect();
    message.scrollTop = message.scrollHeight;
    const after = actions.getBoundingClientRect();
    return {
      messageHeight: message.clientHeight,
      messageScrollHeight: message.scrollHeight,
      messageScrollTop: message.scrollTop,
      actionsBefore: { top: before.top, bottom: before.bottom },
      actionsAfter: { top: after.top, bottom: after.bottom },
      modalScrollHeight: element.scrollHeight,
      modalHeight: element.clientHeight,
    };
  });
  console.log(
    JSON.stringify({ event: "action-dialog-scroll", name, ...inspection }),
  );
  const outputDirectory = process.env.E2E_OBSIDIAN_DIALOG_LAYOUT_DIR;
  if (outputDirectory) {
    await writeFile(
      resolve(outputDirectory, `${name}-long-message.json`),
      JSON.stringify(inspection, null, 2),
    );
    await modal.screenshot({
      path: resolve(outputDirectory, `${name}-long-message.png`),
    });
  }
  assert(inspection.messageHeight > 0, "The message has no visible scroll area.");
  assert(inspection.messageScrollHeight > inspection.messageHeight);
  assert(inspection.messageScrollTop > 0, "The long message did not scroll.");
  assert.deepEqual(inspection.actionsAfter, inspection.actionsBefore);
  assert(
    inspection.modalScrollHeight <= inspection.modalHeight + 1,
    "The long message created an outer modal scroll area.",
  );
}

async function checkActionLayout(
  modal: Locator,
  name: string,
  vertical: boolean,
  narrow: boolean,
): Promise<void> {
  const focus = await measureActionFocus(modal);
  const measurement = await modal.evaluate((element) => {
    const message = element.querySelector(".vpk-action-dialog__message")!;
    const actions = element.querySelector(".vpk-action-dialog__actions")!;
    const buttonElements = Array.from(
      actions.querySelectorAll(".vpk-action-dialog__action"),
    );
    const [messageBounds, actionBounds, ...buttonBounds] = [
      message,
      actions,
      ...buttonElements,
    ].map((target) => {
      const rect = target.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    });
    const buttons = buttonElements.map((button, index) => {
      const textRange = document.createRange();
      textRange.selectNodeContents(button);
      return {
        ...buttonBounds[index],
        textLines: new Set(
          Array.from(textRange.getClientRects(), (rect) => rect.top),
        ).size,
        clientWidth: button.clientWidth,
        scrollWidth: button.scrollWidth,
      };
    });
    return {
      message: messageBounds,
      actions: actionBounds,
      flexDirection: getComputedStyle(actions).flexDirection,
      buttons,
      viewportWidth: window.innerWidth,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    };
  });
  console.log(
    JSON.stringify({ event: "action-dialog-layout", name, ...measurement, focus }),
  );
  const outputDirectory = process.env.E2E_OBSIDIAN_DIALOG_LAYOUT_DIR;
  if (outputDirectory) {
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      resolve(outputDirectory, `${name}.json`),
      JSON.stringify({ ...measurement, focus }, null, 2),
    );
    await modal.screenshot({ path: resolve(outputDirectory, `${name}.png`) });
  }

  for (const button of focus) {
    assert(
      button.focusVisible,
      `${name}: the button has no keyboard focus indicator.`,
    );
    // The reviewed standard theme draws a 3 CSS-pixel outer focus shadow.
    assert.match(
      button.shadow,
      / 0px 0px 0px 3px$/,
      `${name}: unexpected focus shadow.`,
    );
    for (const clip of button.clips) {
      assert(
        !clip.x ||
          (button.left - 3 >= clip.left - 0.5 &&
            button.right + 3 <= clip.right + 0.5),
        `${name}: the horizontal focus shadow is clipped by ${clip.classes}.`,
      );
      assert(
        !clip.y ||
          (button.top - 3 >= clip.top - 0.5 &&
            button.bottom + 3 <= clip.bottom + 0.5),
        `${name}: the vertical focus shadow is clipped by ${clip.classes}.`,
      );
    }
  }

  const aligned = (actual: number, expected: number, edge: string) => {
    assert(
      Math.abs(actual - expected) <= 1,
      `${name}: ${edge} is ${actual}, expected ${expected} within 1 CSS pixel.`,
    );
  };
  aligned(
    measurement.actions.left,
    measurement.message.left,
    "action area left edge",
  );
  aligned(
    measurement.actions.right,
    measurement.message.right,
    "action area right edge",
  );
  assert.equal(measurement.flexDirection, vertical ? "column" : "row");
  assert(
    measurement.scrollWidth <= measurement.clientWidth + 1,
    `${name}: modal overflows horizontally.`,
  );
  assert.equal(measurement.buttons.length, 2);
  for (const button of measurement.buttons) {
    assert(
      button.left >= measurement.message.left - 1,
      `${name}: button starts outside the message area.`,
    );
    assert(
      button.right <= measurement.message.right + 1,
      `${name}: button ends outside the message area.`,
    );
    assert(
      button.left >= 0 && button.right <= measurement.viewportWidth + 1,
      `${name}: button is outside the viewport.`,
    );
    assert(
      button.scrollWidth <= button.clientWidth + 1,
      `${name}: button label overflows horizontally.`,
    );
    if (vertical) {
      aligned(button.left, measurement.message.left, "button left edge");
      aligned(button.right, measurement.message.right, "button right edge");
    }
  }
  if (narrow) {
    assert(
      measurement.buttons[0].textLines > 1,
      `${name}: the long label did not wrap.`,
    );
    assert(
      measurement.buttons[1].top > measurement.buttons[0].top,
      `${name}: actions did not occupy separate rows.`,
    );
  }
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
      await page.setViewportSize({ width: 1024, height: 768 });
      const modal = await activeModal(page, "Restore confirmation");
      await checkActionLayout(modal, "confirm-action-1024", false, false);
      const [restore, cancel] = await Promise.all([
        modal.getByRole("button", { name: "Restore", exact: true }).boundingBox(),
        modal.getByRole("button", { name: "Cancel", exact: true }).boundingBox(),
      ]);
      assert(
        restore && cancel,
        "Expected both confirmation buttons to be visible.",
      );
      assert(
        Math.abs(restore.y - cancel.y) <= 1,
        "Expected short confirmation actions to share a horizontal row.",
      );
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

    for (const width of [1024, 375]) {
      await withObsidianPage(port, async (page) => {
        await page.setViewportSize({ width, height: 768 });
      });
      for (const { story, title, vertical } of [
        {
          story: "confirm-action-long",
          title: "Compatibility review",
          vertical: true,
        },
        {
          story: "confirm-action-wrapped",
          title: "Wrapping action review",
          vertical: false,
        },
      ]) {
        await executeHarnessStory(session, story);
        await withObsidianPage(port, async (page) => {
          const modal = await activeModal(page, title);
          await checkActionLayout(
            modal,
            `${story}-${width}`,
            vertical,
            width === 375,
          );
          if (vertical) {
            await checkLongMessageScroll(modal, `${story}-${width}`);
          }
          await modal
            .getByRole("button", {
              name:
                width === 375
                  ? "Keep synchronisation paused"
                  : "I have reviewed this and updated my other devices — Resume synchronisation",
              exact: true,
            })
            .click();
          await modal.waitFor({ state: "hidden" });
        });
        await waitForHarnessState(
          session,
          (state) =>
            state.lastStory === story &&
            state.lastResult === (width === 375 ? "pause" : "resume"),
          `${story} selection at ${width} CSS pixels`,
        );

        await executeHarnessStory(session, story);
        await withObsidianPage(port, async (page) => {
          const modal = await activeModal(page, title);
          await page.keyboard.press("Escape");
          await modal.waitFor({ state: "hidden" });
        });
        await waitForHarnessState(
          session,
          (state) => state.lastStory === story && state.lastResult === null,
          `${story} dismissal at ${width} CSS pixels`,
        );
      }
    }
    await withObsidianPage(port, async (page) => {
      await page.setViewportSize({ width: 1024, height: 768 });
    });

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
