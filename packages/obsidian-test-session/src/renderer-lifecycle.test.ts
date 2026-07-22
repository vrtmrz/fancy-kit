import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  connectOverCDP: vi.fn(),
}));

vi.mock("playwright", () => ({
  chromium: { connectOverCDP: state.connectOverCDP },
}));

import { closeObsidianRendererPages } from "./renderer-lifecycle.js";

describe("closeObsidianRendererPages", () => {
  beforeEach(() => {
    state.connectOverCDP.mockReset();
  });

  it("closes every renderer page before disconnecting from the isolated application", async () => {
    const firstPageClose = vi.fn(async () => undefined);
    const secondPageClose = vi.fn(async () => undefined);
    const browserClose = vi.fn(async () => undefined);
    state.connectOverCDP.mockResolvedValue({
      contexts: () => [
        { pages: () => [{ close: firstPageClose }] },
        { pages: () => [{ close: secondPageClose }] },
      ],
      close: browserClose,
    });

    await closeObsidianRendererPages(28_052);

    expect(state.connectOverCDP).toHaveBeenCalledWith(
      "http://127.0.0.1:28052",
      { timeout: 2_000 },
    );
    expect(firstPageClose).toHaveBeenCalledOnce();
    expect(secondPageClose).toHaveBeenCalledOnce();
    expect(browserClose).toHaveBeenCalledOnce();
    expect(firstPageClose.mock.invocationCallOrder[0]).toBeLessThan(
      browserClose.mock.invocationCallOrder[0],
    );
    expect(secondPageClose.mock.invocationCallOrder[0]).toBeLessThan(
      browserClose.mock.invocationCallOrder[0],
    );
  });

  it("disconnects the CDP client when a renderer close fails", async () => {
    const browserClose = vi.fn(async () => undefined);
    state.connectOverCDP.mockResolvedValue({
      contexts: () => [
        {
          pages: () => [
            {
              close: vi.fn(async () => {
                throw new Error("renderer close failed");
              }),
            },
          ],
        },
      ],
      close: browserClose,
    });

    await expect(closeObsidianRendererPages(28_052)).rejects.toThrow(
      "renderer close failed",
    );
    expect(browserClose).toHaveBeenCalledOnce();
  });
});
