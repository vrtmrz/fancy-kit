import type { Page } from "playwright";
import { describe, expect, it, vi } from "vitest";
import { waitForObsidianPageUiIdle } from "./ui.ts";

describe("waitForObsidianPageUiIdle", () => {
  it("leaves the renderer unchanged when the startup overlay becomes hidden", async () => {
    const waitFor = vi.fn().mockResolvedValue(undefined);
    const evaluateAll = vi.fn();
    const page = {
      locator: vi.fn(() => ({ waitFor, evaluateAll })),
    } as unknown as Page;

    await waitForObsidianPageUiIdle(page, 25);

    expect(waitFor).toHaveBeenCalledWith({ state: "hidden", timeout: 25 });
    expect(evaluateAll).not.toHaveBeenCalled();
  });

  it("removes only the stale startup overlay after the wait expires", async () => {
    const remove = vi.fn();
    const waitFor = vi.fn().mockRejectedValue(new Error("timeout"));
    const evaluateAll = vi.fn(async (operation: (elements: Element[]) => void) => {
      operation([{ remove } as unknown as Element]);
    });
    const page = {
      locator: vi.fn(() => ({ waitFor, evaluateAll })),
    } as unknown as Page;

    await waitForObsidianPageUiIdle(page, 25);

    expect(page.locator).toHaveBeenCalledWith(".progress-bar-container");
    expect(remove).toHaveBeenCalledOnce();
  });
});
