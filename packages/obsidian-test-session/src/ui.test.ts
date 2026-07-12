import type { Page } from "playwright";
import { describe, expect, it, vi } from "vitest";
import {
  obsidianRemoteDebuggingPort,
  waitForObsidianPageVault,
  waitForObsidianPageUiIdle,
} from "./ui.js";

describe("obsidianRemoteDebuggingPort", () => {
  it("records an explicit valid port in the supplied environment", () => {
    const env = { E2E_OBSIDIAN_REMOTE_DEBUGGING_PORT: "32123" };
    expect(obsidianRemoteDebuggingPort(env)).toBe(32123);
    expect(env.E2E_OBSIDIAN_REMOTE_DEBUGGING_PORT).toBe("32123");
  });

  it.each(["0", "65536", "not-a-port", "1.5"])(
    "rejects the invalid port %s",
    (port) => {
      expect(() =>
        obsidianRemoteDebuggingPort({
          E2E_OBSIDIAN_REMOTE_DEBUGGING_PORT: port,
        }),
      ).toThrowError(RangeError);
    },
  );
});

describe("waitForObsidianPageUiIdle", () => {
  it("leaves the renderer unchanged when the start-up overlay becomes hidden", async () => {
    const waitFor = vi.fn().mockResolvedValue(undefined);
    const evaluateAll = vi.fn();
    const page = {
      locator: vi.fn(() => ({ waitFor, evaluateAll })),
    } as unknown as Page;

    await waitForObsidianPageUiIdle(page, 25);

    expect(waitFor).toHaveBeenCalledWith({ state: "hidden", timeout: 25 });
    expect(evaluateAll).not.toHaveBeenCalled();
  });

  it("removes only the stale start-up overlay after the wait expires", async () => {
    const remove = vi.fn();
    const waitFor = vi.fn().mockRejectedValue(new Error("timeout"));
    const evaluateAll = vi.fn(
      async (operation: (elements: Element[]) => void) => {
        operation([{ remove } as unknown as Element]);
      },
    );
    const page = {
      locator: vi.fn(() => ({ waitFor, evaluateAll })),
    } as unknown as Page;

    await waitForObsidianPageUiIdle(page, 25);

    expect(page.locator).toHaveBeenCalledWith(".progress-bar-container");
    expect(remove).toHaveBeenCalledOnce();
  });
});

describe("waitForObsidianPageVault", () => {
  it("requires the renderer vault path to match the isolated vault exactly", async () => {
    const waitForFunction = vi.fn().mockResolvedValue(undefined);
    const page = { waitForFunction } as unknown as Page;

    await waitForObsidianPageVault(page, "/tmp/isolated-vault", 250);

    expect(waitForFunction).toHaveBeenCalledOnce();
    expect(waitForFunction.mock.calls[0]?.[1]).toBe("/tmp/isolated-vault");
    expect(waitForFunction.mock.calls[0]?.[2]).toEqual({ timeout: 250 });
  });
});
